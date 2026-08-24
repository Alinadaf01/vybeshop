from rest_framework import serializers

from config.media import absolute_media_url

from .models import ApiCredential, ShippingMethod, SiteSettings

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


class ShippingMethodSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ShippingMethod
        fields = ["id", "name", "cost", "free_above", "estimated_days"]

    def get_id(self, obj: ShippingMethod) -> str:
        return str(obj.pk)


class PaymentGatewaySerializer(serializers.ModelSerializer):
    """See BACKEND-TASK.md §3 — code/name/order here must exactly match
    apps.orders.providers.PAYMENT_PROVIDERS keys and display_name values."""

    code = serializers.SerializerMethodField()
    name = serializers.CharField(source="get_service_display")
    logo = serializers.SerializerMethodField()

    class Meta:
        model = ApiCredential
        fields = ["code", "name", "logo", "description", "order"]

    def get_code(self, obj: ApiCredential) -> str:
        return obj.service.upper()

    def get_logo(self, obj: ApiCredential) -> str | None:
        if not obj.logo:
            return None
        return absolute_media_url(self.context.get("request"), obj.logo)
