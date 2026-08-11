import secrets

from django.conf import settings as django_settings
from django.http import Http404, HttpResponseRedirect
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import ColorOption, Product
from apps.settings.models import ShippingMethod
from apps.users.models import Address
from apps.users.permissions import IsNotImpersonating

from .models import Cart, CartItem, Order
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    CheckoutInputSerializer,
    InitiatePaymentSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    UpdateCartItemSerializer,
)
from .services import CheckoutError, checkout, initiate_payment, verify_payment

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
    # A support-mode (impersonated) session can browse the cart/checkout
    # pages to reproduce a reported bug but must not actually place an
    # order on the customer's behalf.
    permission_classes = [IsAuthenticated, IsNotImpersonating]
    # Authenticated (needs a real, OTP-verified account first) but still
    # worth a per-user cap — placing orders triggers a payment-gateway
    # redirect and stock reservation, both worth rate-limiting against
    # scripted abuse (§7.5 security review).
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "checkout"

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


INVOICE_ELIGIBLE_STATUSES = {"paid", "processing", "shipped", "delivered", "returned"}


class OrderInvoicePdfView(APIView):
    """GET /api/orders/{number}/invoice.pdf — BACKEND-TASK.md §3.6-الف.
    Only the order's own customer or staff, and only once paid — an unpaid
    order has no real invoice yet."""

    permission_classes = [IsAuthenticated]

    def get(self, request, number: str):
        from apps.documents.invoice import get_invoice_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        try:
            order = Order.objects.get(number=number)
        except Order.DoesNotExist:
            raise Http404

        if order.user_id != request.user.id and not request.user.is_staff:
            raise Http404
        if order.status not in INVOICE_ELIGIBLE_STATUSES:
            return Response(
                {"detail": "فاکتور فقط برای سفارش‌های پرداخت‌شده در دسترس است."}, status=status.HTTP_400_BAD_REQUEST
            )

        pdf_bytes = get_invoice_pdf(order, generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename(f"invoice-{order.number}"))


class PaymentInitiateView(APIView):
    """Deliberately separate from CheckoutView — checkout creates the
    pending order, this starts a payment attempt against it. Splitting them
    is what lets the gateway re-validation in initiate_payment() happen
    right before the user is sent to the bank, not back when the order was
    first created (see BACKEND-TASK.md's "gateway disabled mid-flow" trap)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, number: str):
        try:
            order = Order.objects.get(number=number, user=request.user)
        except Order.DoesNotExist:
            raise Http404

        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payment, redirect_url = initiate_payment(
                order=order, gateway_code=serializer.validated_data["gateway_code"]
            )
        except CheckoutError as exc:
            field = exc.field or "detail"
            return Response({field: exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"redirectUrl": redirect_url}, status=status.HTTP_201_CREATED)


class PaymentCallbackView(APIView):
    """Hit directly by the payment gateway redirecting the user's browser
    back — never called by the SPA's own fetch layer, so it authenticates
    via the idempotency token in the URL, not a JWT, and responds with a
    redirect (not JSON) straight back into the SPA."""

    permission_classes = [AllowAny]

    def _handle(self, request, gateway: str, token: str) -> HttpResponseRedirect:
        callback_data = {**request.GET.dict(), **request.POST.dict()}
        try:
            payment = verify_payment(gateway_code=gateway, idempotency_key=token, callback_data=callback_data)
        except CheckoutError:
            return HttpResponseRedirect(f"{django_settings.FRONTEND_BASE_URL}/checkout/callback?status=failed")

        outcome = "success" if payment.status == "success" else "failed"
        url = f"{django_settings.FRONTEND_BASE_URL}/checkout/callback?order={payment.order.number}&status={outcome}"
        return HttpResponseRedirect(url)

    def get(self, request, gateway: str, token: str):
        return self._handle(request, gateway, token)

    def post(self, request, gateway: str, token: str):
        return self._handle(request, gateway, token)
