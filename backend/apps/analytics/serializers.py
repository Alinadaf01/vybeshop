from rest_framework import serializers


class PageViewInputSerializer(serializers.Serializer):
    path = serializers.CharField(max_length=255)
    referrer = serializers.CharField(max_length=500, required=False, allow_blank=True)
    product_slug = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
