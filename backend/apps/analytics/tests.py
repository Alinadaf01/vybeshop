from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.analytics.models import DailyStat, PageView
from apps.analytics.tasks import aggregate_daily_stats, is_bot_user_agent


class PageViewApiTests(APITestCase):
    def test_records_a_page_view(self):
        response = self.client.post(
            reverse("pageview-create"),
            {"path": "/products/vybe-stand-air", "referrer": "https://google.com"},
            format="json",
            HTTP_USER_AGENT="Mozilla/5.0 test",
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(PageView.objects.count(), 1)
        view = PageView.objects.first()
        self.assertEqual(view.path, "/products/vybe-stand-air")
        self.assertFalse(view.is_bot)

    def test_never_stores_raw_ip(self):
        self.client.post(
            reverse("pageview-create"), {"path": "/"}, format="json", REMOTE_ADDR="203.0.113.5"
        )
        view = PageView.objects.first()
        # visitor_hash is a sha256 hex digest — the raw IP never appears anywhere on the row.
        self.assertEqual(len(view.visitor_hash), 64)
        self.assertNotIn("203.0.113.5", view.visitor_hash)

    def test_bot_user_agent_flagged(self):
        self.client.post(
            reverse("pageview-create"), {"path": "/"}, format="json", HTTP_USER_AGENT="Googlebot/2.1"
        )
        self.assertTrue(PageView.objects.first().is_bot)

    def test_api_paths_are_not_recorded(self):
        response = self.client.post(
            reverse("pageview-create"), {"path": "/api/products/"}, format="json"
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(PageView.objects.count(), 0)

    def test_is_bot_user_agent_helper(self):
        self.assertTrue(is_bot_user_agent("Mozilla/5.0 (compatible; Googlebot/2.1)"))
        self.assertFalse(is_bot_user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"))


class DailyStatAggregationTests(APITestCase):
    def test_aggregates_yesterdays_page_views(self):
        yesterday = timezone.localdate() - timezone.timedelta(days=1)
        yesterday_dt = timezone.make_aware(
            timezone.datetime.combine(yesterday, timezone.datetime.min.time())
        ) + timezone.timedelta(hours=12)

        PageView.objects.create(path="/", visitor_hash="a" * 64)
        PageView.objects.create(path="/products", visitor_hash="a" * 64)  # same visitor
        PageView.objects.create(path="/blog", visitor_hash="b" * 64)
        PageView.objects.filter(path__in=["/", "/products", "/blog"]).update(created_at=yesterday_dt)

        aggregate_daily_stats()

        stat = DailyStat.objects.get(date=yesterday)
        self.assertEqual(stat.page_views, 3)
        self.assertEqual(stat.unique_visitors, 2)

    def test_purges_page_views_older_than_retention_window(self):
        old_date = timezone.now() - timezone.timedelta(days=100)
        PageView.objects.create(path="/", visitor_hash="a" * 64)
        PageView.objects.filter(path="/").update(created_at=old_date)

        aggregate_daily_stats()

        self.assertEqual(PageView.objects.count(), 0)
