import json

from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.parsers import FormParser, MultiPartParser

from apps.settings.models import ApiCredential, ShippingMethod, SiteSettings

from .activity import AdminActivityLogMixin
from .permissions import IsAdminStaff


class AdminSiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            "phone_display", "phone_href", "email", "address", "business_hours",
            "instagram_url", "telegram_url", "whatsapp_url", "linkedin_url", "youtube_url", "pinterest_url",
            "google_maps_embed", "latitude", "longitude",
            "trust_badge_label", "trust_badge_image", "trust_badge_url", "payment_gateway_label",
            "logo_light", "logo_dark", "favicon", "default_og_image",
            "google_analytics_id", "google_tag_manager_id",
        ]


class AdminSiteSettingsView(RetrieveUpdateAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminSiteSettingsSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return SiteSettings.load()


class AdminApiCredentialSerializer(serializers.ModelSerializer):
    """`credentials` is intentionally absent from `fields` for reads — it's
    accepted on write via a separate write-only field so it never appears
    in a response body (ADMIN-API-CONTRACT.md §12, mirrors §0(د))."""

    id = serializers.SerializerMethodField()
    credentials = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = ApiCredential
        fields = ["id", "service", "label", "is_active", "is_sandbox", "order", "credentials"]

    def get_id(self, obj: ApiCredential) -> str:
        return str(obj.pk)

    def to_internal_value(self, data):
        attrs = super().to_internal_value(data)
        if "credentials" in attrs:
            attrs["credentials"] = json.dumps(attrs["credentials"])
        return attrs


class AdminApiCredentialListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminApiCredentialSerializer
    pagination_class = None
    queryset = ApiCredential.objects.all()
    activity_log_exclude_fields = {"credentials"}


class AdminApiCredentialDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminStaff]
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
    permission_classes = [IsAdminStaff]
    serializer_class = AdminShippingMethodSerializer
    pagination_class = None
    queryset = ShippingMethod.objects.all()


class AdminShippingMethodDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminShippingMethodSerializer
    queryset = ShippingMethod.objects.all()
