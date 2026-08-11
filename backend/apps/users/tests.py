from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.analytics.models import AdminActivityLog
from apps.catalog.models import Category, Product
from apps.inventory.models import StockMovement
from apps.notifications.models import SmsLog
from apps.orders.models import Cart, CartItem
from apps.users.models import Address, ImpersonationTicket, OTPCode, User


class OtpFlowTests(APITestCase):
    def test_request_otp_creates_sms_log_via_notification_service(self):
        response = self.client.post(reverse("otp-request"), {"phone": "09121110000"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(OTPCode.objects.filter(phone="09121110000").exists())
        log = SmsLog.objects.filter(phone="09121110000").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.template.key, "otp_login")

    def test_request_otp_rate_limited_after_three_in_window(self):
        for _ in range(3):
            self.client.post(reverse("otp-request"), {"phone": "09121110001"}, format="json")
        response = self.client.post(reverse("otp-request"), {"phone": "09121110001"}, format="json")
        self.assertEqual(response.status_code, 429)

    def test_verify_wrong_code_rejected(self):
        OTPCode.issue("09121110002", "111111")
        response = self.client.post(
            reverse("otp-verify"), {"phone": "09121110002", "code": "000000"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_verify_correct_code_creates_verified_user_and_issues_jwt(self):
        OTPCode.issue("09121110003", "222222")
        response = self.client.post(
            reverse("otp-verify"), {"phone": "09121110003", "code": "222222"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(response.data["isNewUser"])
        user = User.objects.get(phone="09121110003")
        self.assertTrue(user.is_verified)

    def test_verify_merges_guest_cart_by_session_key(self):
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=category
        )
        StockMovement.objects.record(product, "purchase", 10, reference="PO-1")
        guest_cart = Cart.objects.create(session_key="guest-session-abc")
        CartItem.objects.create(cart=guest_cart, product=product, quantity=2)

        OTPCode.issue("09121110020", "444444")
        response = self.client.post(
            reverse("otp-verify"),
            {"phone": "09121110020", "code": "444444", "cartSessionKey": "guest-session-abc"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        user = User.objects.get(phone="09121110020")
        user_cart = Cart.objects.get(user=user)
        self.assertEqual(user_cart.items.count(), 1)
        self.assertEqual(user_cart.items.first().quantity, 2)
        self.assertFalse(Cart.objects.filter(pk=guest_cart.pk).exists())

    def test_verify_same_code_twice_fails_second_time(self):
        """A used OTP must not be replayable — same guard class as duplicate payment callbacks."""
        OTPCode.issue("09121110004", "333333")
        first = self.client.post(
            reverse("otp-verify"), {"phone": "09121110004", "code": "333333"}, format="json"
        )
        second = self.client.post(
            reverse("otp-verify"), {"phone": "09121110004", "code": "333333"}, format="json"
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)


class AddressTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="09121110005", is_verified=True)
        self.other_user = User.objects.create_user(phone="09121110006", is_verified=True)
        self.client.force_authenticate(user=self.user)

    def test_list_is_a_plain_array_not_a_paginated_envelope(self):
        Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="...", postal_code="1111111111",
            receiver_name="A", receiver_phone="09121110005",
        )
        response = self.client.get(reverse("address-list"))
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_creating_second_default_unsets_first(self):
        first = Address.objects.create(
            user=self.user, province="تهران", city="تهران", line="...", postal_code="1111111111",
            receiver_name="A", receiver_phone="09121110005", is_default=True,
        )
        response = self.client.post(
            reverse("address-list"),
            {
                "province": "تهران", "city": "تهران", "line": "...", "postalCode": "2222222222",
                "receiverName": "B", "receiverPhone": "09121110005", "isDefault": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        first.refresh_from_db()
        self.assertFalse(first.is_default)

    def test_user_cannot_access_another_users_address(self):
        other_address = Address.objects.create(
            user=self.other_user, province="تهران", city="تهران", line="...", postal_code="3333333333",
            receiver_name="C", receiver_phone="09121110006",
        )
        response = self.client.get(reverse("address-detail", args=[other_address.pk]))
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_request_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("address-list"))
        self.assertEqual(response.status_code, 401)


class ImpersonationFlowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(phone="09121110080", password="admin-pass-123")
        self.customer = User.objects.create_user(phone="09121110081", is_verified=True)

    def test_consume_valid_ticket_issues_restricted_access_token(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        response = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertEqual(response.data["user"]["phone"], self.customer.phone)
        self.assertEqual(response.data["expiresInSeconds"], 30 * 60)

        access = AccessToken(response.data["access"])
        self.assertTrue(access["impersonated"])
        self.assertEqual(access["impersonatorId"], self.admin.pk)
        self.assertTrue(
            AdminActivityLog.objects.filter(
                user=self.admin, action="impersonate_start", object_id=str(self.customer.pk)
            ).exists()
        )

    def test_ticket_is_single_use(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        first = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")
        second = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)

    def test_expired_ticket_rejected(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        ticket.expires_at = timezone.now() - timezone.timedelta(seconds=1)
        ticket.save(update_fields=["expires_at"])
        response = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_unknown_ticket_rejected(self):
        response = self.client.post(reverse("impersonate-consume"), {"ticket": "does-not-exist"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_end_session_logs_and_requires_impersonated_token(self):
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        consume = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")

        response = self.client.post(reverse("impersonate-end"), HTTP_AUTHORIZATION=f"Bearer {consume.data['access']}")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AdminActivityLog.objects.filter(
                user=self.admin, action="impersonate_end", object_id=str(self.customer.pk)
            ).exists()
        )

    def test_end_session_rejects_a_normal_login_token(self):
        OTPCode.issue("09121110082", "555555")
        login = self.client.post(reverse("otp-verify"), {"phone": "09121110082", "code": "555555"}, format="json")
        response = self.client.post(reverse("impersonate-end"), HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.assertEqual(response.status_code, 400)

    def test_impersonated_session_cannot_delete_address(self):
        address = Address.objects.create(
            user=self.customer, province="تهران", city="تهران", line="...",
            postal_code="1234567890", receiver_name="A", receiver_phone="09121110081",
        )
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        consume = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")

        response = self.client.delete(
            reverse("address-detail", args=[address.pk]), HTTP_AUTHORIZATION=f"Bearer {consume.data['access']}"
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Address.objects.filter(pk=address.pk).exists())

    def test_impersonated_session_can_still_read_addresses(self):
        Address.objects.create(
            user=self.customer, province="تهران", city="تهران", line="...",
            postal_code="1234567890", receiver_name="A", receiver_phone="09121110081",
        )
        ticket = ImpersonationTicket.issue(target_user=self.customer, issued_by=self.admin)
        consume = self.client.post(reverse("impersonate-consume"), {"ticket": ticket.token}, format="json")

        response = self.client.get(reverse("address-list"), HTTP_AUTHORIZATION=f"Bearer {consume.data['access']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)


class AdminManualUserCreationTests(TestCase):
    """Staff must be able to create a pre-verified user directly, bypassing
    OTP entirely — for when SMS delivery fails (BACKEND-TASK.md §users)."""

    def setUp(self):
        self.staff = User.objects.create_superuser(phone="09120009999", password="staff-pass-123")
        self.client.force_login(self.staff)

    def test_staff_can_create_pre_verified_user_without_otp(self):
        response = self.client.post(
            "/admin/users/user/add/",
            {
                "phone": "09301112233",
                "password1": "a-strong-pass-123",
                "password2": "a-strong-pass-123",
                "is_verified": "on",
                "is_active": "on",
            },
        )
        self.assertEqual(response.status_code, 302)  # redirect on success
        user = User.objects.get(phone="09301112233")
        self.assertTrue(user.is_verified)
        self.assertFalse(OTPCode.objects.filter(phone="09301112233").exists())
