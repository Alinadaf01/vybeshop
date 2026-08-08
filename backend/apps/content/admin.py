from django.contrib import admin

from .models import BlogPost, CatalogEdition, CatalogFile, CatalogSpread, ContactMessage, Coupon, ProductReview


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "author", "is_published", "published_at"]
    list_filter = ["category", "is_published"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "subject", "is_read", "submitted_at"]
    list_filter = ["is_read", "subject"]
    search_fields = ["name", "email", "message"]
    readonly_fields = ["ip_address", "submitted_at"]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "rating", "status", "verified_purchase", "created_at"]
    list_filter = ["status", "rating", "verified_purchase"]
    search_fields = ["product__name"]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "type", "value", "used_count", "usage_limit", "is_active"]
    list_filter = ["type", "is_active"]
    search_fields = ["code"]


class CatalogSpreadInline(admin.TabularInline):
    model = CatalogSpread
    extra = 1


class CatalogEditionInline(admin.TabularInline):
    model = CatalogEdition
    extra = 1


@admin.register(CatalogFile)
class CatalogFileAdmin(admin.ModelAdmin):
    list_display = ["title", "edition", "page_count", "file_size_mb", "updated_at"]
    inlines = [CatalogSpreadInline, CatalogEditionInline]

    def has_add_permission(self, request):
        return not CatalogFile.objects.exists()
