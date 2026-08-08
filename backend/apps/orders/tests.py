from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product
from apps.content.models import Coupon
from apps.inventory.models import StockMovement
from apps.orders.models import Cart, CartItem, InvalidOrderTransition, Order, OrderItem
from apps.settings.models import ShippingMethod
from apps.users.models import Address, User


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
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "paid")
        self.assertIsNotNone(self.order.paid_at)
        self.assertEqual(self.product.stock_count, 8)  # deducted at payment, not later

        self.order.start_processing()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "processing")

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

    def test_double_mark_paid_does_not_double_deduct_stock(self):
        """Guards the same class of bug as a duplicate payment-gateway callback."""
        self.order.mark_paid()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        with self.assertRaises(InvalidOrderTransition):
            self.order.mark_paid()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)  # unchanged — not deducted twice

    def test_cancel_from_paid_reverses_stock(self):
        self.order.mark_paid()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.order.cancel(reason="مشتری منصرف شد")
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "canceled")
        self.assertEqual(self.product.stock_count, 10)  # fully reversed

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

    def test_cancel_from_pending_does_not_touch_stock(self):
        self.order.cancel(reason="منصرف شدم")
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "canceled")
        self.assertEqual(self.product.stock_count, 10)  # nothing was ever deducted

    def test_mark_returned_reverses_stock(self):
        self.order.mark_paid()
        self.order.start_processing()
        self.order.mark_shipped(tracking_code="TRACK-1")
        self.order.mark_delivered()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 8)

        self.order.mark_returned()
        self.product.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "returned")
        self.assertEqual(self.product.stock_count, 10)


class CartApiTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=category
        )
        StockMovement.objects.record(self.product, "purchase", 10, reference="PO-1")

    def test_guest_cart_gets_a_session_key_and_reuses_it(self):
        response = self.client.post(
            reverse("cart-item-create"), {"productId": self.product.pk, "quantity": 2}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        session_key = response.headers.get("X-Cart-Session")
        self.assertTrue(session_key)
        self.assertEqual(response.data["item_count"], 2)
        self.assertEqual(response.data["subtotal"], 200000)

        response2 = self.client.post(
            reverse("cart-item-create"),
            {"productId": self.product.pk, "quantity": 1},
            format="json",
            HTTP_X_CART_SESSION=session_key,
        )
        self.assertEqual(response2.status_code, 201)
        self.assertEqual(response2.data["item_count"], 3)
        self.assertEqual(len(response2.data["items"]), 1)

    def test_price_is_never_taken_from_the_client(self):
        response = self.client.post(
            reverse("cart-item-create"),
            {"productId": self.product.pk, "quantity": 1, "price": 1},
            format="json",
        )
        self.assertEqual(response.data["subtotal"], 100000)

    def test_authenticated_user_cart_persists_without_session_header(self):
        user = User.objects.create_user(phone="09121110010", is_verified=True)
        self.client.force_authenticate(user=user)
        response = self.client.post(
            reverse("cart-item-create"), {"productId": self.product.pk, "quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("X-Cart-Session", response.headers)
        self.assertEqual(Cart.objects.get(user=user).items.count(), 1)

    def test_update_and_delete_cart_item(self):
        response = self.client.post(
            reverse("cart-item-create"), {"productId": self.product.pk, "quantity": 1}, format="json"
        )
        session_key = response.headers["X-Cart-Session"]
        item_id = response.data["items"][0]["id"]

        response = self.client.patch(
            reverse("cart-item-detail", args=[item_id]),
            {"quantity": 5},
            format="json",
            HTTP_X_CART_SESSION=session_key,
        )
        self.assertEqual(response.data["item_count"], 5)

        response = self.client.delete(
            reverse("cart-item-detail", args=[item_id]), HTTP_X_CART_SESSION=session_key
        )
        self.assertEqual(response.data["item_count"], 0)


class CheckoutApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="09121110011", is_verified=True)
        self.client.force_authenticate(user=self.user)
        self.address = Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="خیابان ولیعصر",
            postal_code="1234567890", receiver_name="Ali", receiver_phone="09121110011",
        )
        self.shipping = ShippingMethod.objects.create(name="پست پیشتاز", cost=50000, free_above=500000)
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=category
        )
        StockMovement.objects.record(self.product, "purchase", 10, reference="PO-1")
        Cart.objects.create(user=self.user)

    def _add_to_cart(self, quantity=2):
        self.client.post(reverse("cart-item-create"), {"productId": self.product.pk, "quantity": quantity}, format="json")

    def test_checkout_computes_totals_server_side(self):
        self._add_to_cart(quantity=2)
        response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["subtotal"], 200000)
        self.assertEqual(response.data["discount"], 0)
        self.assertEqual(response.data["shipping_cost"], 50000)
        self.assertEqual(response.data["tax"], 0)
        self.assertEqual(response.data["total"], 250000)
        self.assertEqual(response.data["status"], "pending")
        order = Order.objects.get(number=response.data["number"])
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.first().price, 100000)

    def test_checkout_empties_the_cart(self):
        self._add_to_cart(quantity=1)
        self.client.post(
            reverse("checkout"), {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk}, format="json"
        )
        self.assertEqual(Cart.objects.get(user=self.user).items.count(), 0)

    def test_checkout_never_deducts_stock_before_payment(self):
        self._add_to_cart(quantity=2)
        self.client.post(
            reverse("checkout"), {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk}, format="json"
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_count, 10)

    def test_checkout_free_shipping_above_threshold(self):
        self._add_to_cart(quantity=6)
        response = self.client.post(
            reverse("checkout"), {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk}, format="json"
        )
        self.assertEqual(response.data["shipping_cost"], 0)

    def test_checkout_rejects_insufficient_stock(self):
        self._add_to_cart(quantity=999)
        response = self.client.post(
            reverse("checkout"), {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_checkout_rejects_empty_cart(self):
        response = self.client.post(
            reverse("checkout"), {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_checkout_rejects_another_users_address(self):
        other = User.objects.create_user(phone="09121110012", is_verified=True)
        other_address = Address.objects.create(
            user=other, province="تهران", city="تهران", line="...", postal_code="1111111111",
            receiver_name="Other", receiver_phone="09121110012",
        )
        self._add_to_cart(quantity=1)
        response = self.client.post(
            reverse("checkout"), {"addressId": other_address.pk, "shippingMethodId": self.shipping.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_percent_coupon_applies_discount_capped_by_max_discount(self):
        Coupon.objects.create(code="SAVE20", type="percent", value=20, max_discount=15000)
        self._add_to_cart(quantity=2)
        response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk, "couponCode": "SAVE20"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["discount"], 15000)

    def test_coupon_below_min_order_value_rejected(self):
        Coupon.objects.create(code="BIGORDER", type="fixed", value=10000, min_order_value=1000000)
        self._add_to_cart(quantity=1)
        response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk, "couponCode": "BIGORDER"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("coupon_code", response.data)

    def test_expired_coupon_rejected(self):
        Coupon.objects.create(
            code="OLD10", type="fixed", value=10000, ends_at=timezone.now() - timezone.timedelta(days=1)
        )
        self._add_to_cart(quantity=1)
        response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk, "couponCode": "OLD10"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_exhausted_coupon_rejected(self):
        Coupon.objects.create(code="LIMITED", type="fixed", value=10000, usage_limit=1, used_count=1)
        self._add_to_cart(quantity=1)
        response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk, "couponCode": "LIMITED"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_coupon_scoped_to_other_category_does_not_apply(self):
        other_category = Category.objects.create(slug="other", name="Other")
        coupon = Coupon.objects.create(code="OTHERCAT", type="fixed", value=10000)
        coupon.categories.add(other_category)
        self._add_to_cart(quantity=1)
        response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk, "couponCode": "OTHERCAT"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_coupon_used_count_increments(self):
        coupon = Coupon.objects.create(code="TRACK1", type="fixed", value=10000)
        self._add_to_cart(quantity=1)
        self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk, "couponCode": "TRACK1"},
            format="json",
        )
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 1)


class OrderHistoryApiTests(APITestCase):
    def test_user_only_sees_their_own_orders(self):
        user = User.objects.create_user(phone="09121110013", is_verified=True)
        other = User.objects.create_user(phone="09121110014", is_verified=True)
        Order.objects.create(user=user, shipping_address={}, total=1000)
        Order.objects.create(user=other, shipping_address={}, total=2000)

        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("order-list"))
        self.assertEqual(response.data["count"], 1)

    def test_order_detail_not_found_for_another_users_order(self):
        user = User.objects.create_user(phone="09121110015", is_verified=True)
        other = User.objects.create_user(phone="09121110016", is_verified=True)
        order = Order.objects.create(user=other, shipping_address={}, total=1000)

        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("order-detail", args=[order.number]))
        self.assertEqual(response.status_code, 404)
