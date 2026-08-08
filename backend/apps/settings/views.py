from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import ShippingMethod, SiteSettings
from .serializers import ShippingMethodSerializer, SiteSettingsSerializer


class SiteSettingsDetailView(RetrieveAPIView):
    serializer_class = SiteSettingsSerializer

    def get_object(self):
        return SiteSettings.load()


class ShippingMethodListView(ListAPIView):
    serializer_class = ShippingMethodSerializer
    pagination_class = None
    queryset = ShippingMethod.objects.filter(is_active=True)
