from django.conf import settings
from django.db import models


class AdminActivityLog(models.Model):
    """Who changed what and when — appended by admin API views, never edited."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="activity_logs"
    )
    action = models.CharField(max_length=100, help_text='e.g. "update", "delete", "bulk_price_edit"')
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50, blank=True)
    changes = models.JSONField(blank=True, null=True, help_text="{field: [old, new], ...}")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} {self.action} {self.model_name}#{self.object_id}"
