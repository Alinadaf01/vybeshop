from django.db import models

SMS_STATUS_CHOICES = [
    ("queued", "در صف"),
    ("sent", "ارسال‌شده"),
    ("failed", "ناموفق"),
]


class SmsTemplate(models.Model):
    """Edited from the admin panel so copy can change without a redeploy."""

    key = models.SlugField(unique=True, help_text='e.g. "otp_login", "order_paid", "order_shipped"')
    title = models.CharField(max_length=150)
    body = models.TextField(help_text="Use {placeholders} like {code}, {orderNumber}")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class SmsLog(models.Model):
    """Append-only — the only way to answer 'the SMS never arrived'."""

    phone = models.CharField(max_length=11)
    template = models.ForeignKey(
        SmsTemplate, on_delete=models.SET_NULL, blank=True, null=True, related_name="logs"
    )
    body = models.TextField()
    status = models.CharField(max_length=10, choices=SMS_STATUS_CHOICES, default="queued")
    provider_message_id = models.CharField(max_length=100, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phone", "created_at"])]

    def __str__(self):
        return f"{self.phone} — {self.status}"
