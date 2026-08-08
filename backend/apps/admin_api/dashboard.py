from datetime import timedelta

from django.db.models import F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.content.models import ContactMessage, ProductReview
from apps.orders.models import Order, OrderItem
from apps.users.models import User

from .orders import ORDER_PREFETCH, AdminOrderSerializer
from .permissions import IsAdminStaff
from .products import PRODUCT_PREFETCH, AdminProductSerializer


class AdminDashboardView(APIView):
    permission_classes = [IsAdminStaff]

    def get(self, request):
        now = timezone.now()
        # `now.date()` would give the UTC date; every `__date` ORM lookup
        # below converts to settings.TIME_ZONE (Asia/Tehran, UTC+3:30) first
        # — using the naive UTC date here would silently disagree with the
        # DB for ~3.5 hours around every UTC midnight.
        today = timezone.localtime(now).date()
        month_start = today.replace(day=1)
        week_ago = now - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=29)

        paid_orders = Order.objects.filter(paid_at__isnull=False)
        sales_today = paid_orders.filter(paid_at__date=today).aggregate(total=Sum("total"))["total"] or 0
        sales_this_month = paid_orders.filter(paid_at__date__gte=month_start).aggregate(total=Sum("total"))["total"] or 0

        pending_orders = Order.objects.filter(status="processing").count()
        unpaid_orders = Order.objects.filter(status="pending").count()

        low_stock_count = Product.objects.filter(
            stock_alert__is_active=True, stock_count__lte=F("stock_alert__reorder_point")
        ).count()

        unread_messages = ContactMessage.objects.filter(is_read=False).count()
        pending_reviews = ProductReview.objects.filter(status="pending").count()
        new_users_this_week = User.objects.filter(created_at__gte=week_ago).count()

        chart_rows = {
            row["day"]: row["total"]
            for row in paid_orders.filter(paid_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDate("paid_at"))
            .values("day")
            .annotate(total=Sum("total"))
        }
        sales_chart = [
            {"date": (thirty_days_ago + timedelta(days=i)).isoformat(), "total": chart_rows.get(thirty_days_ago + timedelta(days=i), 0)}
            for i in range(30)
        ]

        recent_orders = Order.objects.select_related("user").prefetch_related(*ORDER_PREFETCH).order_by("-created_at")[:10]

        top_items = (
            OrderItem.objects.filter(order__paid_at__gte=week_ago, product__isnull=False)
            .values("product_id")
            .annotate(units_sold=Sum("quantity"))
            .order_by("-units_sold")[:5]
        )
        product_by_id = {
            p.pk: p
            for p in Product.objects.filter(pk__in=[row["product_id"] for row in top_items])
            .select_related("category")
            .prefetch_related(*PRODUCT_PREFETCH)
        }
        top_products = [
            {"product": AdminProductSerializer(product_by_id[row["product_id"]]).data, "units_sold": row["units_sold"]}
            for row in top_items
            if row["product_id"] in product_by_id
        ]

        return Response(
            {
                "sales_today": sales_today,
                "sales_this_month": sales_this_month,
                "pending_orders": pending_orders,
                "unpaid_orders": unpaid_orders,
                "low_stock_count": low_stock_count,
                "unread_messages": unread_messages,
                "pending_reviews": pending_reviews,
                "new_users_this_week": new_users_this_week,
                "sales_chart": sales_chart,
                "recent_orders": AdminOrderSerializer(recent_orders, many=True).data,
                "top_products_this_week": top_products,
            }
        )
