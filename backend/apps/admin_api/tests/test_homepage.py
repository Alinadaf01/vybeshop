import io

from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from apps.catalog.models import Product
from apps.content.models import CommunityTile, HeroSection, HomeShowcase

from .base import AdminApiTestMixin


def _fake_image_file(name="hero.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


class AdminHeroSectionApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_get_and_patch_singleton(self):
        response = self.client.get(reverse("admin-homepage-hero"))
        self.assertEqual(response.status_code, 200)

        response = self.client.patch(
            reverse("admin-homepage-hero"), {"title": "New Title"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(HeroSection.load().title, "New Title")

    def test_multiword_image_field_upload_is_written(self):
        # Regression: the same camelCase-multipart bug already hit blog.py's
        # coverImage and settings_admin.py's logoLight — a multi-word field
        # name silently dropped on plain MultiPartParser/FormParser instead
        # of landing on image_mobile.
        response = self.client.patch(
            reverse("admin-homepage-hero"), {"imageMobile": _fake_image_file()}, format="multipart"
        )
        self.assertEqual(response.status_code, 200)
        hero = HeroSection.load()
        self.assertTrue(bool(hero.image_mobile))

    def test_non_staff_denied(self):
        self.client.force_authenticate(user=self.make_customer())
        response = self.client.get(reverse("admin-homepage-hero"))
        self.assertEqual(response.status_code, 403)


class AdminHomeShowcaseApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.staff = self.make_staff()
        self.client.force_authenticate(user=self.staff)

    def test_create_active_showcase(self):
        response = self.client.post(
            reverse("admin-homepage-showcase-list"),
            {"order": 1, "title": "Showcase One", "ctaUrl": "/products", "isActive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["resolved_title"], "Showcase One")
        self.assertEqual(response.data["resolved_cta_url"], "/products")

    def test_third_active_showcase_rejected(self):
        # Server-side cap, not just a UI limit (HOMEPAGE-ADMIN-TASK.md §3).
        HomeShowcase.objects.create(order=1, title="A", is_active=True)
        HomeShowcase.objects.create(order=2, title="B", is_active=True)
        response = self.client.post(
            reverse("admin-homepage-showcase-list"),
            {"order": 3, "title": "C", "isActive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("is_active", response.data)

    def test_inactive_showcase_does_not_count_toward_cap(self):
        HomeShowcase.objects.create(order=1, title="A", is_active=True)
        HomeShowcase.objects.create(order=2, title="B", is_active=False)
        response = self.client.post(
            reverse("admin-homepage-showcase-list"),
            {"order": 3, "title": "C", "isActive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_editing_existing_active_showcase_does_not_trip_its_own_cap(self):
        # Excluding self from the cap count — otherwise no active showcase
        # could ever be edited once two exist.
        a = HomeShowcase.objects.create(order=1, title="A", is_active=True)
        HomeShowcase.objects.create(order=2, title="B", is_active=True)
        response = self.client.patch(
            reverse("admin-homepage-showcase-detail", args=[a.pk]),
            {"title": "A renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_linked_product_autofills_title_image_link(self):
        product = self.make_product(sku="SHOWCASE-01", slug="showcase-product", name="Showcase Product")
        showcase = HomeShowcase.objects.create(order=1, product=product, is_active=True)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        self.assertEqual(response.data["resolved_title"], "Showcase Product")
        self.assertEqual(response.data["resolved_cta_url"], "/products/showcase-product")
        self.assertEqual(response.data["product_detail"]["slug"], "showcase-product")

    def test_deleted_linked_product_does_not_break_showcase(self):
        # HOMEPAGE-ADMIN-TASK.md §1: "بلوک نباید بشکند" — on_delete=SET_NULL
        # keeps the showcase row alive with the FK cleared. stock=0 so no
        # StockMovement row exists — Product.delete() is PROTECTed by any
        # movement history, which isn't what this test is about.
        product = self.make_product(sku="SHOWCASE-02", slug="showcase-product-2", name="Showcase Product 2", stock=0)
        showcase = HomeShowcase.objects.create(order=1, product=product, title="Manual Title", is_active=True)
        product.delete()
        showcase.refresh_from_db()
        self.assertIsNone(showcase.product_id)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resolved_title"], "Manual Title")

    def test_deactivated_linked_product_falls_back_to_manual_values(self):
        product = self.make_product(sku="SHOWCASE-03", slug="showcase-product-3", name="Showcase Product 3")
        showcase = HomeShowcase.objects.create(order=1, product=product, is_active=True)
        # .update() bypasses Product.save()'s stock_count-mutation guard —
        # this test only cares about is_active, and the in-memory `product`
        # object's stock_count is stale anyway (make_product's stock movement
        # updated it in the DB, not on this Python object).
        Product.objects.filter(pk=product.pk).update(is_active=False)
        response = self.client.get(reverse("admin-homepage-showcase-detail", args=[showcase.pk]))
        # No manual title was ever set, and the product is no longer usable
        # for auto-fill — resolved_title falls back to blank rather than an
        # inactive product's name, per _product_is_usable(). product_detail
        # itself is a different, admin-only concern: it stays visible
        # (with its own is_active flag) so the admin can actually see which
        # product is linked and notice it needs attention, rather than the
        # panel silently pretending nothing is linked.
        self.assertEqual(response.data["resolved_title"], "")
        self.assertIsNotNone(response.data["product_detail"])
        self.assertFalse(response.data["product_detail"]["is_active"])


class AdminCommunityTileApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_seventh_active_tile_rejected(self):
        for i in range(1, 7):
            CommunityTile.objects.create(order=i, is_active=True)
        response = self.client.post(
            reverse("admin-homepage-tile-list"), {"order": 7, "isActive": True}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("is_active", response.data)

    def test_sixth_active_tile_accepted(self):
        for i in range(1, 6):
            CommunityTile.objects.create(order=i, is_active=True)
        response = self.client.post(
            reverse("admin-homepage-tile-list"), {"order": 6, "isActive": True}, format="json"
        )
        self.assertEqual(response.status_code, 201)


class PublicHomepageApiTests(AdminApiTestMixin, APITestCase):
    """No auth needed — this is the storefront-facing endpoint."""

    def test_hero_null_when_never_configured_active_false(self):
        HeroSection.load()  # creates pk=1 with defaults (is_active=True)
        HeroSection.objects.filter(pk=1).update(is_active=False)
        response = self.client.get(reverse("homepage"))
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["hero"])

    def test_hero_active_is_returned(self):
        HeroSection.objects.filter(pk=1).delete()
        HeroSection.objects.create(pk=1, image_alt="alt text", title="T", is_active=True)
        response = self.client.get(reverse("homepage"))
        self.assertIsNotNone(response.data["hero"])
        self.assertEqual(response.data["hero"]["title"], "T")

    def test_only_active_showcases_returned_ordered(self):
        HomeShowcase.objects.create(order=2, title="Second", is_active=True)
        HomeShowcase.objects.create(order=1, title="First", is_active=True)
        HomeShowcase.objects.create(order=1, title="Hidden", is_active=False)
        response = self.client.get(reverse("homepage"))
        titles = [s["title"] for s in response.data["showcases"]]
        self.assertEqual(titles, ["First", "Second"])

    def test_no_active_community_tiles_returns_empty_list(self):
        CommunityTile.objects.create(order=1, is_active=False)
        response = self.client.get(reverse("homepage"))
        self.assertEqual(response.data["community_tiles"], [])
