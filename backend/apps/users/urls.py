from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/otp/request/", views.RequestOtpView.as_view(), name="otp-request"),
    path("auth/otp/verify/", views.VerifyOtpView.as_view(), name="otp-verify"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("auth/impersonate/consume/", views.ImpersonateConsumeView.as_view(), name="impersonate-consume"),
    path("auth/impersonate/end/", views.ImpersonateEndView.as_view(), name="impersonate-end"),
    path("addresses/", views.AddressListCreateView.as_view(), name="address-list"),
    path("addresses/<int:pk>/", views.AddressDetailView.as_view(), name="address-detail"),
]
