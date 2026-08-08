from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import Category

from .base import AdminApiTestMixin


class AdminCategoryApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_and_list(self):
        response = self.client.post(reverse("admin-category-list"), {"slug": "stands", "name": "Stands"}, format="json")
        self.assertEqual(response.status_code, 201)
        response = self.client.get(reverse("admin-category-list"))
        self.assertEqual(response.data["count"], 1)

    def test_two_level_max_depth_enforced(self):
        top = Category.objects.create(slug="top", name="Top")
        child = Category.objects.create(slug="child", name="Child", parent=top)
        response = self.client.post(
            reverse("admin-category-list"), {"slug": "grandchild", "name": "Grandchild", "parent": child.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_child_of_top_level_is_allowed(self):
        top = Category.objects.create(slug="top", name="Top")
        response = self.client.post(
            reverse("admin-category-list"), {"slug": "child", "name": "Child", "parent": top.pk}, format="json"
        )
        self.assertEqual(response.status_code, 201)
