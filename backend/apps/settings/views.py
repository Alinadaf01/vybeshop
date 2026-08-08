from rest_framework.generics import RetrieveAPIView

from .models import SiteSettings
from .serializers import SiteSettingsSerializer


class SiteSettingsDetailView(RetrieveAPIView):
    serializer_class = SiteSettingsSerializer

    def get_object(self):
        return SiteSettings.load()
