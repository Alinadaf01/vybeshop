from django.urls import path

from . import views

urlpatterns = [
    path("cart/", views.CartDetailView.as_view(), name="cart-detail"),
    path("cart/items/", views.CartItemCreateView.as_view(), name="cart-item-create"),
    path("cart/items/<int:pk>/", views.CartItemUpdateDeleteView.as_view(), name="cart-item-detail"),
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("orders/", views.OrderListView.as_view(), name="order-list"),
    path("orders/<str:number>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:number>/pay/", views.PaymentInitiateView.as_view(), name="payment-initiate"),
    path(
        "payments/callback/<str:gateway>/<str:token>/",
        views.PaymentCallbackView.as_view(),
        name="payment-callback",
    ),
]
