from django.db import models
from encrypted_model_fields.fields import EncryptedTextField


class SiteSettings(models.Model):
    """Singleton — always pk=1. Use SiteSettings.load() to fetch/create it."""

    phone_display = models.CharField(max_length=30, blank=True)
    phone_href = models.CharField(max_length=30, blank=True, help_text='e.g. "+982112345678" for tel:')
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    business_hours = models.JSONField(default=list, help_text="[{day, time}, ...]")

    instagram_url = models.URLField(blank=True)
    telegram_url = models.URLField(blank=True)
    whatsapp_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    pinterest_url = models.URLField(blank=True)

    google_maps_embed = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    trust_badge_label = models.CharField(max_length=100, blank=True)
    trust_badge_image = models.ImageField(upload_to="settings/", blank=True, null=True)
    trust_badge_url = models.URLField(blank=True)
    payment_gateway_label = models.CharField(max_length=100, blank=True)

    logo_light = models.ImageField(upload_to="settings/", blank=True, null=True)
    logo_dark = models.ImageField(upload_to="settings/", blank=True, null=True)
    favicon = models.ImageField(upload_to="settings/", blank=True, null=True)
    default_og_image = models.ImageField(upload_to="settings/", blank=True, null=True)

    google_analytics_id = models.CharField(max_length=50, blank=True)
    google_tag_manager_id = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name_plural = "site settings"

    def __str__(self):
        return "Site settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # singleton — never deleted

    @classmethod
    def load(cls) -> "SiteSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


API_CREDENTIAL_SERVICE_CHOICES = [
    ("kavenegar", "کاوه‌نگار"),
    ("zarinpal", "زرین‌پال"),
    ("idpay", "آیدی‌پی"),
    ("snapppay", "اسنپ‌پی"),
    ("digipay", "دیجی‌پی"),
]


class ApiCredential(models.Model):
    """credentials is encrypted at rest — swappable from the admin panel, no redeploy needed."""

    service = models.CharField(max_length=20, choices=API_CREDENTIAL_SERVICE_CHOICES)
    label = models.CharField(max_length=100, blank=True)
    credentials = EncryptedTextField(help_text="JSON string, e.g. {\"apiKey\": \"...\", \"merchantId\": \"...\"}")
    is_active = models.BooleanField(default=True, help_text="controls checkout-time visibility")
    is_sandbox = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["service", "order"]

    def __str__(self):
        return f"{self.get_service_display()} ({self.label or 'default'})"


class ShippingMethod(models.Model):
    name = models.CharField(max_length=100)
    cost = models.PositiveIntegerField()
    free_above = models.PositiveIntegerField(blank=True, null=True)
    estimated_days = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "cost"]

    def __str__(self):
        return self.name
