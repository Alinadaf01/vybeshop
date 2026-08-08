from django.urls import path

from . import views

urlpatterns = [
    path("settings/", views.SiteSettingsDetailView.as_view(), name="site-settings"),
]
