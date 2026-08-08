from django.urls import reverse
from rest_framework.test import APITestCase

from apps.content.models import BlogPost, ContactMessage, Coupon, ProductReview

from .base import AdminApiTestMixin


class AdminMessageApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.message = ContactMessage.objects.create(name="Sara", email="s@example.com", subject="سوال", message="پیام تستی طولانی")

    def test_list_filter_by_is_read(self):
        response = self.client.get(reverse("admin-message-list"), {"isRead": "false"})
        self.assertEqual(response.data["count"], 1)

    def test_patch_marks_read_and_note(self):
        response = self.client.patch(
            reverse("admin-message-detail", args=[self.message.pk]), {"isRead": True, "adminNote": "پاسخ داده شد"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_read)


class AdminReviewApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=0)
        self.review = ProductReview.objects.create(product=self.product, rating=5, status="pending")

    def test_list_filter_by_status(self):
        response = self.client.get(reverse("admin-review-list"), {"status": "pending"})
        self.assertEqual(response.data["count"], 1)

    def test_approve_review(self):
        response = self.client.patch(reverse("admin-review-detail", args=[self.review.pk]), {"status": "approved"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.review.refresh_from_db()
        self.assertEqual(self.review.status, "approved")

    def test_rating_and_body_are_not_editable(self):
        response = self.client.patch(reverse("admin-review-detail", args=[self.review.pk]), {"rating": 1}, format="json")
        self.assertEqual(response.status_code, 200)
        self.review.refresh_from_db()
        self.assertEqual(self.review.rating, 5)  # unchanged, read_only field


class AdminBlogApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_and_publish(self):
        response = self.client.post(
            reverse("admin-blog-list"),
            {"slug": "post-1", "title": "پست اول", "excerpt": "خلاصه", "category": "محصول", "author": "تیم VYBE", "isPublished": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(BlogPost.objects.get(slug="post-1").is_published)


class AdminCouponApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_coupon(self):
        response = self.client.post(
            reverse("admin-coupon-list"), {"code": "SAVE10", "type": "percent", "value": 10}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Coupon.objects.filter(code="SAVE10").exists())

    def test_used_count_is_read_only(self):
        coupon = Coupon.objects.create(code="FIXED20", type="fixed", value=20000, used_count=3)
        response = self.client.patch(reverse("admin-coupon-detail", args=[coupon.pk]), {"usedCount": 999}, format="json")
        self.assertEqual(response.status_code, 200)
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 3)
