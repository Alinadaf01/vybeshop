from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product
from apps.content.models import Favorite
from apps.users.models import User


class FavoriteApiTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=category
        )
        self.other_product = Product.objects.create(
            sku="TEST-002", slug="other-product", name="Other Product", price=200000, category=category
        )
        self.user = User.objects.create_user(phone="09121234567", is_verified=True)

    def test_favorites_require_authentication(self):
        response = self.client.get(reverse("favorite-list-create"))
        self.assertEqual(response.status_code, 401)

    def test_add_favorite_returns_full_product_objects(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("favorite-list-create"), {"productId": self.product.pk}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["slug"], "test-product")
        self.assertIn("images", response.data[0])
        self.assertIn("price", response.data[0])

    def test_adding_the_same_product_twice_is_idempotent(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(reverse("favorite-list-create"), {"productId": self.product.pk}, format="json")
        response = self.client.post(reverse("favorite-list-create"), {"productId": self.product.pk}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(Favorite.objects.filter(user=self.user, product=self.product).count(), 1)

    def test_add_unknown_product_returns_404(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("favorite-list-create"), {"productId": 999999}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_remove_favorite(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(reverse("favorite-list-create"), {"productId": self.product.pk}, format="json")
        response = self.client.delete(reverse("favorite-delete", args=[self.product.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_removing_a_favorite_that_was_never_saved_is_a_no_op(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(reverse("favorite-delete", args=[self.product.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_list_only_shows_the_current_users_favorites(self):
        other_user = User.objects.create_user(phone="09121110099", is_verified=True)
        Favorite.objects.create(user=other_user, product=self.product)
        Favorite.objects.create(user=self.user, product=self.other_product)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("favorite-list-create"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["slug"], "other-product")

    def test_list_most_recent_first(self):
        Favorite.objects.create(user=self.user, product=self.product)
        Favorite.objects.create(user=self.user, product=self.other_product)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("favorite-list-create"))
        self.assertEqual([p["slug"] for p in response.data], ["other-product", "test-product"])

    def test_merge_adds_guest_favorites_and_ignores_unknown_ids(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("favorite-merge"),
            {"productIds": [self.product.pk, self.other_product.pk, 999999]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(Favorite.objects.filter(user=self.user).count(), 2)

    def test_merge_does_not_duplicate_existing_favorites(self):
        Favorite.objects.create(user=self.user, product=self.product)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("favorite-merge"), {"productIds": [self.product.pk, self.other_product.pk]}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(Favorite.objects.filter(user=self.user, product=self.product).count(), 1)
