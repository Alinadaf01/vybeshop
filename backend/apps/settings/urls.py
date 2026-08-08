from django.urls import path

from . import views

urlpatterns = [
    path("settings/", views.SiteSettingsDetailView.as_view(), name="site-settings"),
    path("shipping-methods/", views.ShippingMethodListView.as_view(), name="shipping-method-list"),
    path("payment-gateways/", views.PaymentGatewayListView.as_view(), name="payment-gateway-list"),
]
