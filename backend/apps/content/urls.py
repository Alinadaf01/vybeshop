from django.urls import path

from . import views

urlpatterns = [
    path("homepage/", views.HomepageContentView.as_view(), name="homepage"),
    path("blog/", views.BlogPostListView.as_view(), name="blog-list"),
    path("blog/<slug:slug>/", views.BlogPostDetailView.as_view(), name="blog-detail"),
    path("contact/", views.ContactMessageCreateView.as_view(), name="contact-create"),
    path("catalog/", views.CatalogFileDetailView.as_view(), name="catalog-detail"),
    path("favorites/", views.FavoriteListCreateView.as_view(), name="favorite-list-create"),
    path("favorites/merge/", views.FavoriteMergeView.as_view(), name="favorite-merge"),
    path("favorites/<int:product_id>/", views.FavoriteDeleteView.as_view(), name="favorite-delete"),
]
