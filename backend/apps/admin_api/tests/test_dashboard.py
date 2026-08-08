from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItem

from .base import AdminApiTestMixin


class AdminDashboardApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=10, price=100000)
        customer = self.make_customer()
        self.order = Order.objects.create(user=customer, shipping_address={}, subtotal=100000, total=100000)
        OrderItem.objects.create(
            order=self.order, product=self.product, product_name=self.product.name, sku=self.product.sku,
            price=100000, quantity=1,
        )
        self.order.paid_at = timezone.now()
        self.order.status = "paid"
        self.order.save(update_fields=["paid_at", "status"])

    def test_dashboard_shape(self):
        response = self.client.get(reverse("admin-dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["sales_today"], 100000)
        self.assertEqual(len(response.data["sales_chart"]), 30)
        self.assertEqual(len(response.data["recent_orders"]), 1)
        self.assertEqual(len(response.data["top_products_this_week"]), 1)
        self.assertEqual(response.data["top_products_this_week"][0]["units_sold"], 1)
