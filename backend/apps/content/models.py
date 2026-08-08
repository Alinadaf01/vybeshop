import secrets

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

BLOG_CATEGORY_CHOICES = [
    ("محصول", "محصول"),
    ("طراحی", "طراحی"),
    ("آموزش", "آموزش"),
    ("سبک زندگی", "سبک زندگی"),
    ("جامعه", "جامعه"),
]


class BlogPost(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300)
    category = models.CharField(max_length=20, choices=BLOG_CATEGORY_CHOICES)
    sections = models.JSONField(
        default=list, help_text="[{id, heading, body}, ...] — matches frontend BlogSection[]"
    )
    cover_image = models.ImageField(upload_to="blog/", blank=True, null=True)
    external_cover_url = models.CharField(
        max_length=500, blank=True, help_text="Static asset path, used until a real image is uploaded."
    )
    author = models.CharField(max_length=100)
    author_role = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list)
    reading_time = models.PositiveIntegerField(default=1, help_text="minutes")
    is_published = models.BooleanField(default=False)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def resolved_cover_url(self) -> str:
        return self.cover_image.url if self.cover_image else self.external_cover_url


def generate_tracking_code() -> str:
    return f"VYBE-{secrets.token_hex(3).upper()}"


class ContactMessage(models.Model):
    tracking_code = models.CharField(max_length=20, unique=True, default=generate_tracking_code, editable=False)
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=100)
    message = models.TextField()
    newsletter = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    admin_note = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.name} — {self.subject}"


REVIEW_STATUS_CHOICES = [
    ("pending", "در انتظار بررسی"),
    ("approved", "تأییدشده"),
    ("rejected", "ردشده"),
]


class ProductReview(models.Model):
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=150, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=REVIEW_STATUS_CHOICES, default="pending")
    admin_reply = models.TextField(blank=True)
    verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} — {self.rating}/5"


COUPON_TYPE_CHOICES = [
    ("percent", "درصدی"),
    ("fixed", "مبلغ ثابت"),
]


class Coupon(models.Model):
    code = models.CharField(max_length=30, unique=True)
    type = models.CharField(max_length=10, choices=COUPON_TYPE_CHOICES)
    value = models.PositiveIntegerField(help_text="percent (1-100) or Toman amount, per `type`")
    min_order_value = models.PositiveIntegerField(default=0)
    max_discount = models.PositiveIntegerField(blank=True, null=True, help_text="cap for percent coupons")
    usage_limit = models.PositiveIntegerField(blank=True, null=True)
    used_count = models.PositiveIntegerField(default=0)
    per_user_limit = models.PositiveIntegerField(blank=True, null=True)
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    categories = models.ManyToManyField("catalog.Category", blank=True, related_name="coupons")
    products = models.ManyToManyField("catalog.Product", blank=True, related_name="coupons")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

    def is_exhausted(self) -> bool:
        return self.usage_limit is not None and self.used_count >= self.usage_limit


class CatalogFile(models.Model):
    """A single downloadable-PDF record, not a list of products — singleton, always pk=1."""

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    format = models.CharField(max_length=20, default="PDF")
    file_url = models.CharField(max_length=500)
    file_size_mb = models.DecimalField(max_digits=6, decimal_places=1)
    page_count = models.PositiveIntegerField()
    edition = models.CharField(max_length=50)
    cover_image = models.CharField(max_length=500, blank=True)
    updated_at = models.DateField()

    class Meta:
        verbose_name_plural = "catalog file"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # singleton — never deleted

    @classmethod
    def load(cls) -> "CatalogFile | None":
        return cls.objects.filter(pk=1).first()


class CatalogSpread(models.Model):
    catalog = models.ForeignKey(CatalogFile, on_delete=models.CASCADE, related_name="spreads")
    image = models.CharField(max_length=500)
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.catalog.title} spread #{self.order}"


class CatalogEdition(models.Model):
    catalog = models.ForeignKey(CatalogFile, on_delete=models.CASCADE, related_name="editions")
    label = models.CharField(max_length=50)
    is_current = models.BooleanField(default=False)
    page_count = models.PositiveIntegerField()
    file_size_mb = models.DecimalField(max_digits=6, decimal_places=1)
    file_url = models.CharField(max_length=500)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.catalog.title} — {self.label}"
