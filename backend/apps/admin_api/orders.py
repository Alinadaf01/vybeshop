import django_filters
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import InvalidOrderTransition, Order

from .activity import log_admin_action
from .permissions import IsAdminStaff

ORDER_PREFETCH = ("items", "payments", "status_logs")


class AdminOrderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product = serializers.IntegerField(source="product_id", allow_null=True)
    product_name = serializers.CharField()
    sku = serializers.CharField()
    price = serializers.IntegerField()
    color_name = serializers.CharField()
    quantity = serializers.IntegerField()
    subtotal = serializers.IntegerField()


class AdminPaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    gateway = serializers.CharField()
    amount = serializers.IntegerField()
    status = serializers.CharField()
    ref_id = serializers.CharField()
    created_at = serializers.DateTimeField()
    verified_at = serializers.DateTimeField(allow_null=True)


class AdminOrderStatusLogSerializer(serializers.Serializer):
    from_status = serializers.CharField()
    to_status = serializers.CharField()
    note = serializers.CharField()
    user = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()

    def get_user(self, obj) -> str | None:
        return obj.user.get_full_name() if obj.user else None


class AdminOrderSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    user = serializers.IntegerField(source="user_id")
    items = AdminOrderItemSerializer(many=True, read_only=True)
    payments = AdminPaymentSerializer(many=True, read_only=True)
    status_logs = AdminOrderStatusLogSerializer(many=True, read_only=True)
    coupon = serializers.IntegerField(source="coupon_id", allow_null=True)

    class Meta:
        model = Order
        fields = [
            "id", "number", "user", "status", "shipping_address",
            "subtotal", "discount", "shipping_cost", "tax", "total",
            "coupon", "note", "tracking_code",
            "items", "payments", "status_logs",
            "created_at", "updated_at", "paid_at", "shipped_at",
        ]

    def get_id(self, obj: Order) -> str:
        return str(obj.pk)


class AdminOrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    user = django_filters.NumberFilter(field_name="user_id")
    dateFrom = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    dateTo = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    search = django_filters.CharFilter(field_name="number", lookup_expr="icontains")

    class Meta:
        model = Order
        fields = []


class AdminOrderListView(ListAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminOrderSerializer
    filterset_class = AdminOrderFilter
    queryset = Order.objects.select_related("user").prefetch_related(*ORDER_PREFETCH)


class AdminOrderDetailView(RetrieveAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminOrderSerializer
    queryset = Order.objects.select_related("user").prefetch_related(*ORDER_PREFETCH)


def _transition_response(order: Order, method_name: str, /, **kwargs) -> Response:
    try:
        getattr(order, method_name)(**kwargs)
    except InvalidOrderTransition as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    order.refresh_from_db()
    return Response(AdminOrderSerializer(order).data)


class AdminOrderMarkPaidView(APIView):
    permission_classes = [IsAdminStaff]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "mark_paid", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_paid", model_name="Order", object_id=order.pk)
        return response


class AdminOrderStartProcessingView(APIView):
    permission_classes = [IsAdminStaff]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "start_processing", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="start_processing", model_name="Order", object_id=order.pk)
        return response


class AdminOrderMarkShippedView(APIView):
    permission_classes = [IsAdminStaff]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        tracking_code = request.data.get("tracking_code", "")
        response = _transition_response(order, "mark_shipped", tracking_code=tracking_code, user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_shipped", model_name="Order", object_id=order.pk)
        return response


class AdminOrderMarkDeliveredView(APIView):
    permission_classes = [IsAdminStaff]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        response = _transition_response(order, "mark_delivered", user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="mark_delivered", model_name="Order", object_id=order.pk)
        return response


class AdminOrderCancelView(APIView):
    permission_classes = [IsAdminStaff]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        reason = request.data.get("reason", "")
        response = _transition_response(order, "cancel", reason=reason, user=request.user)
        if response.status_code == 200:
            log_admin_action(user=request.user, action="cancel", model_name="Order", object_id=order.pk)
        return response
