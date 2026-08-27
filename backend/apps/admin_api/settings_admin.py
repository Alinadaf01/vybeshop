import json

from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView

from apps.settings.models import ApiCredential, ShippingMethod, SiteSettings

from .activity import AdminActivityLogMixin
from .permissions import require_section


_URL_FIELDS = ["instagram_url", "telegram_url", "whatsapp_url", "linkedin_url", "youtube_url", "pinterest_url", "trust_badge_url"]


class AdminSiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            "business_name", "economic_code", "national_id",
            "phone_display", "phone_href", "email", "address", "business_hours",
            "instagram_url", "telegram_url", "whatsapp_url", "linkedin_url", "youtube_url", "pinterest_url",
            "google_maps_embed", "latitude", "longitude",
            "trust_badge_label", "trust_badge_image", "trust_badge_url", "payment_gateway_label",
            "logo_light", "logo_dark", "favicon", "default_og_image",
            "google_analytics_id", "google_tag_manager_id",
            "owner_notification_phone", "notify_owner_new_order",
        ]

    def to_internal_value(self, data):
        # A non-technical admin pasting "instagram.com/vybeshop" (no
        # scheme) gets Django's URLField hard-rejecting it as "not a valid
        # URL" with no hint why -- confirmed as the exact friction point
        # reported against this page. Every one of these fields is meant
        # to be a full external link, so a missing scheme is unambiguous:
        # prepend https:// rather than reject.
        data = data.copy() if hasattr(data, "copy") else dict(data)
        for field in _URL_FIELDS:
            value = data.get(field)
            if value and isinstance(value, str) and not value.startswith(("http://", "https://")):
                data[field] = f"https://{value}"
        return super().to_internal_value(data)


class AdminSiteSettingsView(RetrieveUpdateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminSiteSettingsSerializer
    # Multipart for the image fields (logos, favicon, trust badge) *plus*
    # JSON — the panel only switches to multipart when an image file is
    # actually being uploaded, and sends plain JSON the rest of the time
    # (e.g. toggling notifyOwnerNewOrder). Restricting this to multipart
    # only, as it originally was, made every text-only PATCH 415.
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]

    def get_object(self):
        return SiteSettings.load()


class AdminApiCredentialSerializer(serializers.ModelSerializer):
    """`credentials` is intentionally absent from `fields` for reads — it's
    accepted on write via a separate write-only field so it never appears
    in a response body (ADMIN-API-CONTRACT.md §12, mirrors §0(د)).
    `is_configured` is the read-side stand-in: enough for the panel to show
    a "تنظیم شده" badge without ever exposing the secret itself."""

    id = serializers.SerializerMethodField()
    credentials = serializers.JSONField(write_only=True, required=False)
    is_configured = serializers.SerializerMethodField()

    class Meta:
        model = ApiCredential
        fields = ["id", "service", "label", "is_active", "is_sandbox", "order", "is_configured", "credentials"]

    def get_id(self, obj: ApiCredential) -> str:
        return str(obj.pk)

    def get_is_configured(self, obj: ApiCredential) -> bool:
        return obj.has_valid_credentials()

    def to_internal_value(self, data):
        attrs = super().to_internal_value(data)
        if "credentials" in attrs:
            attrs["credentials"] = json.dumps(attrs["credentials"])
        return attrs


class AdminApiCredentialListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("credentials")]
    serializer_class = AdminApiCredentialSerializer
    pagination_class = None
    queryset = ApiCredential.objects.all()
    activity_log_exclude_fields = {"credentials"}


class AdminApiCredentialDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("credentials")]
    serializer_class = AdminApiCredentialSerializer
    queryset = ApiCredential.objects.all()
    activity_log_exclude_fields = {"credentials"}


class AdminShippingMethodSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ShippingMethod
        fields = ["id", "name", "cost", "free_above", "estimated_days", "is_active", "order"]

    def get_id(self, obj: ShippingMethod) -> str:
        return str(obj.pk)


class AdminShippingMethodListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminShippingMethodSerializer
    pagination_class = None
    queryset = ShippingMethod.objects.all()


class AdminShippingMethodDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("settings")]
    serializer_class = AdminShippingMethodSerializer
    queryset = ShippingMethod.objects.all()
