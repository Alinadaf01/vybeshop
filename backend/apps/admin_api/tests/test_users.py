from django.urls import reverse
from rest_framework.test import APITestCase

from apps.users.models import Address, User

from .base import AdminApiTestMixin


class AdminUserApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_staff_created_user_can_be_verified_directly(self):
        response = self.client.post(
            reverse("admin-user-list"),
            {"phone": "09121110099", "firstName": "Sara", "isVerified": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(phone="09121110099")
        self.assertTrue(user.is_verified)

    def test_user_detail_includes_addresses_and_order_count(self):
        customer = self.make_customer(phone="09121110005")
        Address.objects.create(user=customer, province="Tehran", city="Tehran", line="...", postal_code="1234567890", receiver_name="Sara", receiver_phone="09121110005")
        response = self.client.get(reverse("admin-user-detail", args=[customer.pk]))
        self.assertEqual(len(response.data["addresses"]), 1)
        self.assertEqual(response.data["order_count"], 0)

    def test_search_filter(self):
        self.make_customer(phone="09121119999")
        response = self.client.get(reverse("admin-user-list"), {"search": "9999"})
        self.assertEqual(response.data["count"], 1)

    def test_patch_user(self):
        customer = self.make_customer(phone="09121110006")
        response = self.client.patch(reverse("admin-user-detail", args=[customer.pk]), {"firstName": "Updated"}, format="json")
        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.first_name, "Updated")

    def test_user_addresses_endpoint(self):
        customer = self.make_customer(phone="09121110007")
        Address.objects.create(user=customer, province="Tehran", city="Tehran", line="...", postal_code="1234567890", receiver_name="Sara", receiver_phone="09121110007")
        response = self.client.get(reverse("admin-user-addresses", args=[customer.pk]))
        self.assertEqual(len(response.data), 1)
