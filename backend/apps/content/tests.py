import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image as PILImage
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product, ProductImage
from apps.content.models import BlogPost, CommunityTile, Favorite, HeroSection, HomeShowcase
from apps.users.models import User


def _fake_image_file(name="test.png"):
    buffer = io.BytesIO()
    PILImage.new("RGB", (10, 10), color="green").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


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


class AbsoluteMediaUrlApiTests(APITestCase):
    """FIX-TASK.md دور چهارم، باگ ۱ — MEDIA_URL نسبی بود، پس obj.image.url
    نسبت به مبدأ فرانت resolve می‌شد نه بک‌اند (دو پورت در dev، دو دامنه در
    production). هر مدل تصویردار عمومی این‌جا با یک عکس واقعی آپلود می‌شود
    تا مطمئن شویم پاسخ API همیشه یک آدرس مطلق (با http) برمی‌گرداند، نه
    مسیر نسبی مثل "/media/...".
    """

    def setUp(self):
        self.category = Category.objects.create(
            slug="desktop-stands", name="Desktop Stands", image=_fake_image_file("category.png")
        )
        self.product = Product.objects.create(
            sku="TEST-001", slug="test-product", name="Test Product", price=100000, category=self.category
        )
        ProductImage.objects.create(product=self.product, image=_fake_image_file("product.png"), order=1)
        BlogPost.objects.create(
            slug="test-post",
            title="Test Post",
            excerpt="...",
            category="طراحی",
            author="Test Author",
            is_published=True,
            cover_image=_fake_image_file("blog.png"),
        )

    def _assert_all_absolute(self, urls):
        self.assertTrue(urls, "expected at least one image URL to check")
        for url in urls:
            self.assertTrue(url.startswith("http"), f"expected an absolute URL, got: {url!r}")

    def test_category_image_is_absolute(self):
        response = self.client.get(reverse("category-list"))
        self.assertEqual(response.status_code, 200)
        self._assert_all_absolute([row["image"] for row in response.data])

    def test_product_images_are_absolute(self):
        response = self.client.get(reverse("product-list"))
        self.assertEqual(response.status_code, 200)
        self._assert_all_absolute(
            [url for row in response.data["results"] for url in row["images"]]
        )

    def test_blog_post_cover_image_is_absolute(self):
        response = self.client.get(reverse("blog-list"))
        self.assertEqual(response.status_code, 200)
        self._assert_all_absolute([row["cover_image"] for row in response.data["results"]])

    def test_homepage_hero_showcase_and_community_images_are_absolute(self):
        hero = HeroSection.load()
        hero.image = _fake_image_file("hero.png")
        hero.image_alt = "test hero"
        hero.is_active = True
        hero.save()

        HomeShowcase.objects.create(
            order=1, image=_fake_image_file("showcase.png"), title="Showcase", is_active=True
        )
        CommunityTile.objects.create(order=1, image=_fake_image_file("tile.png"), is_active=True)

        response = self.client.get(reverse("homepage"))
        self.assertEqual(response.status_code, 200)
        self._assert_all_absolute(
            [
                response.data["hero"]["image"],
                *[row["image"] for row in response.data["showcases"]],
                *[row["image"] for row in response.data["community_tiles"]],
            ]
        )

    def test_favorited_product_images_are_absolute(self):
        user = User.objects.create_user(phone="09121234567", is_verified=True)
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("favorite-list-create"), {"productId": self.product.pk}, format="json")
        self.assertEqual(response.status_code, 201)
        self._assert_all_absolute([url for row in response.data for url in row["images"]])
