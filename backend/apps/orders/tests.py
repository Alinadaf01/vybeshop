import json
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product
from apps.content.models import Coupon
from apps.inventory.models import StockMovement
from apps.notifications.models import SmsLog
from apps.orders.models import Cart, CartItem, InvalidOrderTransition, Order, OrderItem, Payment
from apps.orders.providers import PaymentProviderError, get_provider
from apps.settings.models import ApiCredential, ShippingMethod, SiteSettings
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

    def test_mark_shipped_without_tracking_code_is_rejected(self):
        self.order.mark_paid()
        self.order.start_processing()
        with self.assertRaises(InvalidOrderTransition):
            self.order.mark_shipped(tracking_code="")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "processing")  # unchanged — never silently shipped

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


def _zarinpal_request_response(authority="A-TEST-AUTHORITY"):
    mock = MagicMock()
    mock.json.return_value = {"data": {"code": 100, "authority": authority, "fee_type": "Merchant", "fee": 0}, "errors": []}
    return mock


def _zarinpal_verify_response(code=100, ref_id=987654):
    mock = MagicMock()
    mock.json.return_value = {"data": {"code": code, "ref_id": ref_id}, "errors": []}
    return mock


class PaymentProviderTests(TestCase):
    """Unit-level: the provider classes themselves, network mocked out."""

    def setUp(self):
        self.user = User.objects.create_user(phone="09121110019", is_verified=True)

    def test_get_provider_raises_for_unknown_code(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("NOT-A-GATEWAY")

    def test_provider_raises_when_no_credential_configured(self):
        with self.assertRaises(PaymentProviderError):
            get_provider("ZARINPAL")

    def test_provider_raises_when_credential_is_invalid_json(self):
        ApiCredential.objects.create(service="zarinpal", is_active=True, credentials="")
        # is_active=True + empty credentials would fail clean(), but this
        # simulates a row that reached the DB some other way (fixture/bulk).
        with self.assertRaises(PaymentProviderError):
            get_provider("ZARINPAL")

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_request_builds_startpay_redirect_url(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, is_sandbox=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock_post.return_value = _zarinpal_request_response(authority="A-123")
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=100000)

        result = provider.request(order, "http://backend/callback")
        self.assertEqual(result.authority, "A-123")
        self.assertIn("sandbox.zarinpal.com/pg/StartPay/A-123", result.redirect_url)
        # Rial, not Toman — the payload sent to Zarinpal must be x10.
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["amount"], 1000000)

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_request_raises_on_gateway_rejection(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock = MagicMock()
        mock.json.return_value = {"data": {}, "errors": {"code": -9, "message": "merchant_id نامعتبر است."}}
        mock_post.return_value = mock
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=100000)

        with self.assertRaises(PaymentProviderError):
            provider.request(order, "http://backend/callback")

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_zarinpal_verify_uses_payment_amount_not_callback_data(self, mock_post):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        mock_post.return_value = _zarinpal_verify_response()
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=250000)
        payment = Payment.objects.create(
            order=order, gateway="ZARINPAL", gateway_name="زرین‌پال", amount=250000,
            authority="A-123", idempotency_key="tok-1",
        )

        result = provider.verify({"Status": "OK", "Authority": "A-123"}, payment)
        self.assertTrue(result.success)
        self.assertEqual(result.ref_id, "987654")
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["amount"], 2500000)  # order.total (Toman) * 10, from `payment`

    def test_zarinpal_verify_returns_failure_without_network_call_when_status_not_ok(self):
        ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "m-1"})
        )
        provider = get_provider("ZARINPAL")
        order = Order.objects.create(user=self.user, shipping_address={}, total=250000)
        payment = Payment.objects.create(
            order=order, gateway="ZARINPAL", gateway_name="زرین‌پال", amount=250000,
            authority="A-123", idempotency_key="tok-2",
        )
        with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
            result = provider.verify({"Status": "NOK", "Authority": "A-123"}, payment)
            mock_post.assert_not_called()
        self.assertFalse(result.success)


class PaymentFlowApiTests(APITestCase):
    """End-to-end through the real views: checkout -> initiate payment ->
    gateway callback -> order paid. Only the outbound HTTP call to Zarinpal
    itself is mocked."""

    def setUp(self):
        self.user = User.objects.create_user(phone="09121110020", is_verified=True)
        self.client.force_authenticate(user=self.user)
        self.address = Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="خیابان ولیعصر",
            postal_code="1234567890", receiver_name="Ali", receiver_phone="09121110020",
        )
        self.shipping = ShippingMethod.objects.create(name="پست پیشتاز", cost=50000)
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=category
        )
        StockMovement.objects.record(self.product, "purchase", 10, reference="PO-1")
        Cart.objects.create(user=self.user)
        self.client.post(reverse("cart-item-create"), {"productId": self.product.pk, "quantity": 2}, format="json")
        checkout_response = self.client.post(
            reverse("checkout"),
            {"addressId": self.address.pk, "shippingMethodId": self.shipping.pk},
            format="json",
        )
        self.order_number = checkout_response.data["number"]
        self.order = Order.objects.get(number=self.order_number)

        self.credential = ApiCredential.objects.create(
            service="zarinpal", is_active=True, is_sandbox=True, credentials=json.dumps({"merchantId": "m-1"})
        )

    @patch("apps.orders.providers.zarinpal.requests.post")
    def test_initiate_payment_creates_payment_and_returns_redirect_url(self, mock_post):
        mock_post.return_value = _zarinpal_request_response(authority="A-INIT")
        response = self.client.post(reverse("payment-initiate", args=[self.order_number]), {"gatewayCode": "ZARINPAL"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("A-INIT", response.data["redirectUrl"])
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.gateway, "ZARINPAL")
        self.assertEqual(payment.gateway_name, "زرین‌پال")
        self.assertEqual(payment.amount, self.order.total)
        self.assertEqual(payment.status, "pending")

    def test_initiate_payment_rejects_unconfigured_gateway(self):
        response = self.client.post(reverse("payment-initiate", args=[self.order_number]), {"gatewayCode": "DIGIPAY"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("gateway_code", response.data)
        self.assertFalse(Payment.objects.exists())

    def test_initiate_payment_rejects_inactive_gateway(self):
        self.credential.is_active = False
        self.credential.save(update_fields=["is_active"])
        response = self.client.post(reverse("payment-initiate", args=[self.order_number]), {"gatewayCode": "ZARINPAL"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("gateway_code", response.data)

    def _initiate_and_get_payment(self) -> Payment:
        with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
            mock_post.return_value = _zarinpal_request_response(authority="A-FLOW")
            self.client.post(reverse("payment-initiate", args=[self.order_number]), {"gatewayCode": "ZARINPAL"}, format="json")
        return Payment.objects.get(order=self.order)

    def test_callback_verifies_and_marks_order_paid_with_sms(self):
        site_settings = SiteSettings.load()
        site_settings.owner_notification_phone = "09120000001,09120000002"
        site_settings.save(update_fields=["owner_notification_phone"])

        payment = self._initiate_and_get_payment()
        with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
            mock_post.return_value = _zarinpal_verify_response()
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.get(
                    reverse("payment-callback", args=["ZARINPAL", payment.idempotency_key]),
                    {"Status": "OK", "Authority": "A-FLOW"},
                )

        self.assertEqual(response.status_code, 302)
        self.assertIn(f"order={self.order_number}", response.url)
        self.assertIn("status=success", response.url)

        payment.refresh_from_db()
        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(payment.status, "success")
        self.assertEqual(payment.ref_id, "987654")
        self.assertEqual(self.order.status, "paid")
        self.assertEqual(self.product.stock_count, 8)  # 10 - 2, deducted exactly once

        self.assertEqual(SmsLog.objects.filter(template__key="order_paid", phone=self.user.phone).count(), 1)
        self.assertEqual(SmsLog.objects.filter(template__key="owner_new_order").count(), 2)

    def test_duplicate_callback_does_not_double_deduct_stock_or_resend_sms(self):
        payment = self._initiate_and_get_payment()

        for _ in range(2):
            with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
                mock_post.return_value = _zarinpal_verify_response()
                with self.captureOnCommitCallbacks(execute=True):
                    self.client.get(
                        reverse("payment-callback", args=["ZARINPAL", payment.idempotency_key]),
                        {"Status": "OK", "Authority": "A-FLOW"},
                    )

        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, "paid")
        self.assertEqual(self.product.stock_count, 8)  # still only deducted once
        self.assertEqual(SmsLog.objects.filter(template__key="order_paid").count(), 1)

    def test_callback_with_gateway_failure_leaves_order_pending(self):
        payment = self._initiate_and_get_payment()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.get(
                reverse("payment-callback", args=["ZARINPAL", payment.idempotency_key]),
                {"Status": "NOK", "Authority": "A-FLOW"},
            )

        self.assertIn("status=failed", response.url)
        payment.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(payment.status, "failed")
        self.assertEqual(self.order.status, "pending")

    def test_verify_still_works_after_gateway_disabled_between_request_and_callback(self):
        """The user already paid at the bank — disabling the gateway from
        new checkouts afterward must not strand their in-flight payment."""
        payment = self._initiate_and_get_payment()
        self.credential.is_active = False
        self.credential.save(update_fields=["is_active"])

        with patch("apps.orders.providers.zarinpal.requests.post") as mock_post:
            mock_post.return_value = _zarinpal_verify_response()
            with self.captureOnCommitCallbacks(execute=True):
                self.client.get(
                    reverse("payment-callback", args=["ZARINPAL", payment.idempotency_key]),
                    {"Status": "OK", "Authority": "A-FLOW"},
                )

        payment.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(payment.status, "success")
        self.assertEqual(self.order.status, "paid")

    def test_callback_with_unknown_token_redirects_to_generic_failure(self):
        response = self.client.get(reverse("payment-callback", args=["ZARINPAL", "no-such-token"]), {"Status": "OK"})
        self.assertEqual(response.status_code, 302)
        self.assertIn("status=failed", response.url)

    def test_order_detail_not_found_for_another_users_order(self):
        user = User.objects.create_user(phone="09121110015", is_verified=True)
        other = User.objects.create_user(phone="09121110016", is_verified=True)
        order = Order.objects.create(user=other, shipping_address={}, total=1000)

        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("order-detail", args=[order.number]))
        self.assertEqual(response.status_code, 404)


class OrderInvoicePdfTests(APITestCase):
    """BACKEND-TASK.md §3.6-الف — HTML->PDF via headless Chromium."""

    def setUp(self):
        self.owner = User.objects.create_user(phone="09121110020", is_verified=True)
        self.other = User.objects.create_user(phone="09121110021", is_verified=True)
        self.order = Order.objects.create(
            user=self.owner,
            shipping_address={
                "province": "تهران", "city": "تهران", "line": "خیابان آزادی",
                "postalCode": "1234567890", "receiverName": "علی نادفی", "receiverPhone": "09121110020",
            },
            status="paid",
            subtotal=500000, discount=50000, shipping_cost=30000, tax=0, total=480000,
            paid_at=timezone.now(),
        )
        OrderItem.objects.create(order=self.order, product_name="پایه دسکتاپ VYBE", sku="VYBE-001", price=250000, quantity=2)
        Payment.objects.create(
            order=self.order, gateway="ZARINPAL", gateway_name="زرین‌پال", amount=480000,
            ref_id="REF-12345", status="success", verified_at=timezone.now(), idempotency_key="idem-invoice-test",
        )

    def test_owner_can_download_invoice(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("order-invoice-pdf", args=[self.order.number]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_second_download_is_served_from_cache(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse("order-invoice-pdf", args=[self.order.number])
        first = self.client.get(url).content
        self.order.refresh_from_db()
        cached_at = self.order.invoice_pdf_generated_at
        second = self.client.get(url).content
        self.order.refresh_from_db()
        self.assertEqual(first, second)
        self.assertEqual(cached_at, self.order.invoice_pdf_generated_at)

    def test_other_user_gets_404(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.get(reverse("order-invoice-pdf", args=[self.order.number]))
        self.assertEqual(response.status_code, 404)

    def test_staff_can_download_any_invoice(self):
        staff = User.objects.create_user(phone="09121110022", is_verified=True, is_staff=True)
        self.client.force_authenticate(user=staff)
        response = self.client.get(reverse("order-invoice-pdf", args=[self.order.number]))
        self.assertEqual(response.status_code, 200)

    def test_unpaid_order_returns_400(self):
        pending_order = Order.objects.create(user=self.owner, shipping_address={}, status="pending", total=1000)
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("order-invoice-pdf", args=[pending_order.number]))
        self.assertEqual(response.status_code, 400)

    def test_anonymous_gets_401(self):
        response = self.client.get(reverse("order-invoice-pdf", args=[self.order.number]))
        self.assertEqual(response.status_code, 401)
