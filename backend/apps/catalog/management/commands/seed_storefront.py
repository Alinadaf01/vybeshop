import json
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.conf import settings as django_settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Category, ColorOption, Product, ProductImage
from apps.content.models import BlogPost, CatalogEdition, CatalogFile, CatalogSpread
from apps.inventory.models import StockMovement
from apps.settings.models import SiteSettings

FIXTURES_DIR = Path(django_settings.BASE_DIR) / "fixtures"

_SOCIAL_FIELD_BY_PLATFORM = {
    "INSTAGRAM": "instagram_url",
    "TELEGRAM": "telegram_url",
    "WHATSAPP": "whatsapp_url",
    "LINKEDIN": "linkedin_url",
    "YOUTUBE": "youtube_url",
    "PINTEREST": "pinterest_url",
}


def _load(name: str):
    with open(FIXTURES_DIR / name, encoding="utf-8") as f:
        return json.load(f)


class Command(BaseCommand):
    help = (
        "Seeds the same 24 products / 8 categories / 12 blog posts (plus catalog "
        "file and site settings) that the frontend's src/data/*.ts fake data "
        "uses, from backend/fixtures/*.json (regenerate via "
        "`node scripts/export-fixtures.mjs` after editing src/data/*.ts)."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        self.seed_categories()
        self.seed_products()
        self.seed_blog()
        self.seed_catalog()
        self.seed_site_settings()
        self.stdout.write(self.style.SUCCESS("Storefront seed complete."))

    def seed_categories(self):
        rows = _load("categories.json")
        for index, row in enumerate(rows):
            Category.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "description": row["description"],
                    "external_image_url": row["image"],
                    "order": index,
                    "is_active": True,
                },
            )
        self.stdout.write(f"  categories: {len(rows)}")

    def seed_products(self):
        rows = _load("products.json")
        for index, row in enumerate(rows):
            category = Category.objects.get(slug=row["category"])
            product, _ = Product.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "sku": row["sku"],
                    "name": row["name"],
                    "short_description": row["shortDescription"],
                    "description": row["description"],
                    "price": row["price"],
                    # Sensitive, admin/report-only field — deliberately not part of
                    # the public frontend Product type/fixture (CONTENT-TASK.md §4:
                    # "costPrice برای اینکه گزارش سود خالی نماند"). A flat margin
                    # placeholder computed here instead of exposing it publicly.
                    "cost_price": round(row["price"] * 0.55),
                    "category": category,
                    "material": row["material"],
                    "width_mm": row["dimensions"]["w"],
                    "height_mm": row["dimensions"]["h"],
                    "depth_mm": row["dimensions"]["d"],
                    "weight_g": row["weight"],
                    "layer_height_mm": row["layerHeight"],
                    "order": index,
                    "is_active": True,
                },
            )

            # Reset stock to the fixture's stockCount through the ledger —
            # Product.stock_count can never be written directly (see apps/inventory).
            current = product.stock_count
            target = row["stockCount"]
            if target > current:
                StockMovement.objects.record(product, "adjustment", target - current, reference="seed_storefront")
            elif target < current:
                StockMovement.objects.record(product, "scrap", current - target, reference="seed_storefront")

            product.images.all().delete()
            for image_index, image_path in enumerate(row["images"]):
                ProductImage.objects.create(
                    product=product,
                    external_url=image_path,
                    alt=f"{product.name} — تصویر {image_index + 1}",
                    order=image_index + 1,
                )

            product.colors.all().delete()
            for color_index, color in enumerate(row["colors"]):
                ColorOption.objects.create(
                    product=product,
                    name=color["name"],
                    hex=color["hex"],
                    in_stock=color["inStock"],
                    order=color_index,
                )
        self.stdout.write(f"  products: {len(rows)}")

    def seed_blog(self):
        rows = _load("blog.json")
        for row in rows:
            BlogPost.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "title": row["title"],
                    "excerpt": row["excerpt"],
                    "category": row["category"],
                    "sections": row["sections"],
                    "external_cover_url": row["coverImage"],
                    "author": row["author"],
                    "author_role": row["authorRole"],
                    "tags": row["tags"],
                    "reading_time": row["readingTime"],
                    "is_published": True,
                    "published_at": datetime.fromisoformat(row["publishedAt"]).replace(tzinfo=dt_timezone.utc),
                },
            )
        self.stdout.write(f"  blog posts: {len(rows)}")

    def seed_catalog(self):
        row = _load("catalog.json")
        catalog, _ = CatalogFile.objects.update_or_create(
            pk=1,
            defaults={
                "title": row["title"],
                "description": row["description"],
                "format": row["format"],
                "file_url": row["fileUrl"],
                "file_size_mb": row["fileSizeMb"],
                "page_count": row["pageCount"],
                "edition": row["edition"],
                "cover_image": row["coverImage"],
                "updated_at": row["updatedAt"],
            },
        )
        catalog.spreads.all().delete()
        for index, spread in enumerate(row["spreads"]):
            CatalogSpread.objects.create(
                catalog=catalog, image=spread["image"], caption=spread["caption"], order=index
            )
        catalog.editions.all().delete()
        for index, edition in enumerate(row["editions"]):
            CatalogEdition.objects.create(
                catalog=catalog,
                label=edition["label"],
                is_current=edition["isCurrent"],
                page_count=edition["pageCount"],
                file_size_mb=edition["fileSizeMb"],
                file_url=edition["fileUrl"],
                order=index,
            )
        self.stdout.write("  catalog file: 1 (+%d spreads, %d editions)" % (len(row["spreads"]), len(row["editions"])))

    def seed_site_settings(self):
        row = _load("siteSettings.json")
        settings_obj = SiteSettings.load()
        settings_obj.phone_display = row["phone"]["display"]
        settings_obj.phone_href = row["phone"]["href"]
        settings_obj.email = row["email"]
        settings_obj.address = row["address"]
        settings_obj.business_hours = row["businessHours"]
        settings_obj.trust_badge_label = row["trustBadgeLabel"]
        settings_obj.payment_gateway_label = row["paymentGatewayLabel"]

        # Preserve exact parity with src/data/siteSettings.ts, including "#"
        # placeholder URLs — a filtered subset would defeat the point of
        # diffing frontend fake data against seeded backend data.
        for social in row["socialLinks"]:
            field_name = _SOCIAL_FIELD_BY_PLATFORM.get(social["platform"])
            if field_name:
                setattr(settings_obj, field_name, social["url"])

        settings_obj.save()
        self.stdout.write("  site settings: updated")
