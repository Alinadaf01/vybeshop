import secrets

from django.http import Http404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import ColorOption, Product
from apps.settings.models import ShippingMethod
from apps.users.models import Address

from .models import Cart, CartItem, Order
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    CheckoutInputSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    UpdateCartItemSerializer,
)
from .services import CheckoutError, checkout

CART_SESSION_HEADER = "HTTP_X_CART_SESSION"


def resolve_cart(request) -> tuple[Cart, str | None]:
    """Returns (cart, newSessionKey). newSessionKey is set only when a guest
    had no session key yet — the caller must echo it back in a response
    header so the frontend can persist it for subsequent requests."""
    if request.user and request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart, None

    session_key = request.META.get(CART_SESSION_HEADER)
    new_key = None
    if not session_key:
        session_key = secrets.token_hex(16)
        new_key = session_key
    cart, _ = Cart.objects.get_or_create(user=None, session_key=session_key)
    return cart, new_key


def _cart_response(cart: Cart, new_session_key: str | None, http_status=status.HTTP_200_OK) -> Response:
    response = Response(CartSerializer(cart).data, status=http_status)
    if new_session_key:
        response["X-Cart-Session"] = new_session_key
    return response


class CartDetailView(APIView):
    def get(self, request):
        cart, new_key = resolve_cart(request)
        return _cart_response(cart, new_key)


class CartItemCreateView(APIView):
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, new_key = resolve_cart(request)

        product = Product.objects.get(pk=serializer.validated_data["product_id"])
        color_id = serializer.validated_data.get("color_option_id")
        color = ColorOption.objects.get(pk=color_id) if color_id else None
        quantity = serializer.validated_data["quantity"]

        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, color_option=color, defaults={"quantity": quantity}
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=["quantity"])

        return _cart_response(cart, new_key, http_status=status.HTTP_201_CREATED)


class CartItemUpdateDeleteView(APIView):
    def _get_item(self, request, pk: int) -> tuple[CartItem, Cart, str | None]:
        cart, new_key = resolve_cart(request)
        try:
            item = cart.items.get(pk=pk)
        except CartItem.DoesNotExist:
            raise Http404
        return item, cart, new_key

    def patch(self, request, pk: int):
        item, cart, new_key = self._get_item(request, pk)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.quantity = serializer.validated_data["quantity"]
        item.save(update_fields=["quantity"])
        return _cart_response(cart, new_key)

    def delete(self, request, pk: int):
        item, cart, new_key = self._get_item(request, pk)
        item.delete()
        return _cart_response(cart, new_key)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        input_serializer = CheckoutInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        try:
            address = Address.objects.get(pk=data["address_id"], user=request.user)
        except Address.DoesNotExist:
            return Response({"address_id": "آدرس یافت نشد."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            shipping_method = ShippingMethod.objects.get(pk=data["shipping_method_id"], is_active=True)
        except ShippingMethod.DoesNotExist:
            return Response(
                {"shipping_method_id": "روش ارسال یافت نشد."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = checkout(
                user=request.user,
                address=address,
                shipping_method=shipping_method,
                coupon_code=data.get("coupon_code") or None,
                note=data.get("note", ""),
            )
        except CheckoutError as exc:
            field = exc.field or "detail"
            return Response({field: exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class OrderDetailView(RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "number"
    lookup_url_kwarg = "number"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
