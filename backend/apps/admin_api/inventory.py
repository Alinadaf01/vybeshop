import io

import django_filters
import openpyxl
from django.db.models import F
from django.http import HttpResponse
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.inventory.models import StockAlert, StockMovement

from .activity import log_admin_action
from .permissions import IsAdminStaff


class AdminInventoryRowSerializer(serializers.Serializer):
    product = serializers.SerializerMethodField()
    stock_count = serializers.IntegerField()
    reorder_point = serializers.SerializerMethodField()
    is_low = serializers.SerializerMethodField()
    stock_value = serializers.SerializerMethodField()

    def get_product(self, obj: Product) -> dict:
        return {"id": obj.pk, "name": obj.name, "sku": obj.sku}

    def get_reorder_point(self, obj: Product) -> int | None:
        alert = getattr(obj, "stock_alert", None)
        return alert.reorder_point if alert else None

    def get_is_low(self, obj: Product) -> bool:
        alert = getattr(obj, "stock_alert", None)
        return bool(alert and alert.is_triggered)

    def get_stock_value(self, obj: Product) -> int | None:
        return obj.stock_count * obj.cost_price if obj.cost_price is not None else None


class AdminInventoryFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="category_id")
    isLow = django_filters.BooleanFilter(method="filter_is_low")

    class Meta:
        model = Product
        fields = []

    def filter_is_low(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(stock_alert__is_active=True, stock_count__lte=F("stock_alert__reorder_point"))


class AdminInventoryListView(ListAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminInventoryRowSerializer
    filterset_class = AdminInventoryFilter
    queryset = Product.objects.select_related("stock_alert")


class AdminInventorySummaryView(APIView):
    permission_classes = [IsAdminStaff]

    def get(self, request):
        products = Product.objects.all()
        total_stock_value = None
        priced = products.exclude(cost_price=None)
        if priced.exists():
            total_stock_value = sum(p.stock_count * p.cost_price for p in priced)
        low_stock_count = StockAlert.objects.filter(
            is_active=True, product__stock_count__lte=F("reorder_point")
        ).count()
        return Response({"total_stock_value": total_stock_value, "low_stock_count": low_stock_count})


class StockAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockAlert
        fields = ["reorder_point", "is_active"]


class AdminInventoryAlertView(APIView):
    permission_classes = [IsAdminStaff]

    def patch(self, request, product_id):
        product = Product.objects.get(pk=product_id)
        alert, _ = StockAlert.objects.get_or_create(product=product)
        serializer = StockAlertSerializer(alert, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(user=request.user, action="update", model_name="StockAlert", object_id=product.pk)
        return Response(serializer.data)


class AdminStockMovementSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = ["id", "product", "type", "quantity", "balance_after", "reference", "note", "user", "created_at"]

    def get_id(self, obj: StockMovement) -> str:
        return str(obj.pk)

    def get_user(self, obj: StockMovement) -> str | None:
        return obj.user.get_full_name() if obj.user else None


class AdminStockMovementFilter(django_filters.FilterSet):
    product = django_filters.NumberFilter(field_name="product_id")
    type = django_filters.CharFilter(field_name="type")
    dateFrom = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    dateTo = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = StockMovement
        fields = []


# Only these types can be created manually — sale/return_in are exclusively
# written by the order state machine (ADMIN-API-CONTRACT.md §13).
_MANUAL_MOVEMENT_TYPES = {"purchase", "production", "adjustment", "scrap"}


class CreateStockMovementSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    type = serializers.ChoiceField(choices=sorted(_MANUAL_MOVEMENT_TYPES))
    quantity = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True, default="")


class AdminStockMovementListCreateView(ListAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminStockMovementSerializer
    filterset_class = AdminStockMovementFilter
    queryset = StockMovement.objects.select_related("user").order_by("-created_at")

    def post(self, request):
        serializer = CreateStockMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            product = Product.objects.get(pk=data["product_id"])
            movement = StockMovement.objects.record(
                product, data["type"], abs(data["quantity"]), note=data.get("note", ""), user=request.user
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_admin_action(user=request.user, action="create", model_name="StockMovement", object_id=movement.pk)
        return Response(AdminStockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


class AdminStockMovementExportView(APIView):
    permission_classes = [IsAdminStaff]

    def get(self, request):
        base_qs = StockMovement.objects.select_related("user", "product").order_by("-created_at")
        qs = AdminStockMovementFilter(request.query_params, queryset=base_qs).qs

        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "Stock Movements"
        sheet.append(["ID", "Product", "Type", "Quantity", "Balance After", "Reference", "Note", "User", "Created At"])
        for movement in qs:
            sheet.append([
                movement.pk, movement.product.name, movement.type, movement.quantity, movement.balance_after,
                movement.reference, movement.note, movement.user.get_full_name() if movement.user else "",
                movement.created_at.strftime("%Y-%m-%d %H:%M"),
            ])

        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.read(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="stock-movements.xlsx"'
        return response
