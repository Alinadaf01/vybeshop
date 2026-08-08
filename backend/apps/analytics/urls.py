from django.urls import path

from . import views

urlpatterns = [
    path("analytics/pageview/", views.PageViewCreateView.as_view(), name="pageview-create"),
]
