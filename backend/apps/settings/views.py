from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response

from .models import ApiCredential, ShippingMethod, SiteSettings
from .serializers import PaymentGatewaySerializer, ShippingMethodSerializer, SiteSettingsSerializer

PAYMENT_GATEWAY_SERVICES = ["zarinpal", "idpay", "snapppay", "digipay"]


class SiteSettingsDetailView(RetrieveAPIView):
    serializer_class = SiteSettingsSerializer

    def get_object(self):
        return SiteSettings.load()


class ShippingMethodListView(ListAPIView):
    serializer_class = ShippingMethodSerializer
    pagination_class = None
    queryset = ShippingMethod.objects.filter(is_active=True)


class PaymentGatewayListView(ListAPIView):
    """Only gateways an admin turned on *and* that have usable credentials —
    a row with isActive=True but empty/broken credentials should be
    unreachable through the model's own clean(), but this list re-checks it
    anyway rather than trusting that every write path went through a form."""

    serializer_class = PaymentGatewaySerializer
    pagination_class = None
    filter_backends = []
    queryset = ApiCredential.objects.none()  # for schema generation only — list() below does the real query

    def list(self, request, *args, **kwargs):
        candidates = ApiCredential.objects.filter(service__in=PAYMENT_GATEWAY_SERVICES, is_active=True).order_by(
            "order"
        )
        gateways = [c for c in candidates if c.has_valid_credentials()]
        return Response(self.get_serializer(gateways, many=True).data)
