from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product


class ProductListViewTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(slug="desktop-stands", name="Desktop Stands")
        Product.objects.create(sku="REAL-001", slug="real-product", name="Real Product", price=100000, category=category)
        Product.objects.create(
            sku="VYBE-TEST-NOIMG", slug="test-product-no-image", name="VYBE Test", price=100000, category=category
        )

    def test_no_image_regression_fixture_is_excluded_from_public_grid(self):
        # Regression: this fixture (src/data/products.ts) exists purely for
        # e2e/product-no-image.spec.ts and is supposed to be reachable only
        # by direct slug, per its own comment — but nothing actually
        # enforced that, so it rendered as a striped placeholder card in the
        # real /products grid a customer browses.
        response = self.client.get(reverse("product-list"))
        slugs = [row["slug"] for row in response.data["results"]]
        self.assertIn("real-product", slugs)
        self.assertNotIn("test-product-no-image", slugs)

    def test_no_image_regression_fixture_still_reachable_by_slug(self):
        response = self.client.get(reverse("product-detail", args=["test-product-no-image"]))
        self.assertEqual(response.status_code, 200)
