from rest_framework import serializers

from .models import SiteSettings

_SOCIAL_FIELDS = [
    ("INSTAGRAM", "instagram_url"),
    ("TELEGRAM", "telegram_url"),
    ("WHATSAPP", "whatsapp_url"),
    ("LINKEDIN", "linkedin_url"),
    ("YOUTUBE", "youtube_url"),
    ("PINTEREST", "pinterest_url"),
]


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Public shape only — see API-CONTRACT.md. The admin surface (logos,
    ApiCredential, analytics IDs, etc.) lives in ADMIN-API-CONTRACT.md instead."""

    phone = serializers.SerializerMethodField()
    business_hours = serializers.JSONField()
    social_links = serializers.SerializerMethodField()
    trust_badge_label = serializers.CharField()
    payment_gateway_label = serializers.CharField()

    class Meta:
        model = SiteSettings
        fields = ["phone", "email", "address", "business_hours", "social_links", "trust_badge_label", "payment_gateway_label"]

    def get_phone(self, obj: SiteSettings) -> dict:
        return {"display": obj.phone_display, "href": obj.phone_href}

    def get_social_links(self, obj: SiteSettings) -> list[dict]:
        return [
            {"platform": platform, "url": getattr(obj, field_name)}
            for platform, field_name in _SOCIAL_FIELDS
            if getattr(obj, field_name)
        ]
