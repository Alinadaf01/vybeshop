from django.test import TestCase

from apps.catalog.models import Category, Product
from apps.inventory.models import StockMovement
from apps.orders.models import InvalidOrderTransition, Order, OrderItem
from apps.users.models import User


class OrderStateMachineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="09121234567", password="test-pass")
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=390000, category=category
        )
        StockMovement.objects.record(self.product, "purchase", 10, reference="PO-1")
        self.order = Order.objects.create(
            user=self.user,
            shipping_address={"city": "Tehran", "line": "..."},
            subtotal=390000,
            total=390000,
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            sku=self.product.sku,
            price=self.product.price,
            quantity=2,
        )

    def test_order_item_subtotal_calculation(self):
        item = self.order.items.first()
        self.assertEqual(item.subtotal, 780000)

    def test_happy_path_transitions_and_stock_deduction(self):
        self.order.mark_paid()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "paid")
        self.assertIsNotNone(self.order.paid_at)

        self.order.start_processing()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "processing")
        self.assertEqual(self.product.stock_count, 8)  # 10 - 2 sold

        self.order.mark_shipped(tracking_code="TRACK-123")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "shipped")
        self.assertEqual(self.order.tracking_code, "TRACK-123")

        self.order.mark_delivered()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "delivered")

        # Every hop must be logged.
        transitions = list(self.order.status_logs.values_list("from_status", "to_status"))
        self.assertEqual(
            transitions,
            [
                ("pending", "paid"),
                ("paid", "processing"),
                ("processing", "shipped"),
                ("shipped", "delivered"),
            ],
        )

    def test_invalid_transition_rejected(self):
        with self.assertRaises(InvalidOrderTransition):
            self.order.mark_delivered()  # can't skip straight from pending
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "pending")

    def test_double_start_processing_does_not_double_deduct_stock(self):
        """Guards the same class of bug as a duplicate payment-gateway callback."""
        self.order.mark_paid()
        self.order.start_processing()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        with self.assertRaises(InvalidOrderTransition):
            self.order.start_processing()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)  # unchanged — not deducted twice

    def test_cancel_from_processing_reverses_stock(self):
        self.order.mark_paid()
        self.order.start_processing()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.order.cancel(reason="مشتری منصرف شد")
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "canceled")
        self.assertEqual(self.product.stock_count, 10)  # fully reversed
