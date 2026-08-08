from django.db import models, transaction
from django.utils import timezone

from .models import Cart, CartItem, Order, OrderItem


@transaction.atomic
def merge_guest_cart_into_user(session_key: str, user) -> None:
    """Called from the OTP-verify view — 'merge on login' means at login,
    not as a separate endpoint the frontend has to remember to call."""
    guest_cart = Cart.objects.filter(user=None, session_key=session_key).first()
    if not guest_cart:
        return

    user_cart, _ = Cart.objects.get_or_create(user=user)
    for guest_item in guest_cart.items.all():
        existing = CartItem.objects.filter(
            cart=user_cart, product=guest_item.product, color_option=guest_item.color_option
        ).first()
        if existing:
            existing.quantity += guest_item.quantity
            existing.save(update_fields=["quantity"])
        else:
            guest_item.cart = user_cart
            guest_item.save(update_fields=["cart"])

    guest_cart.delete()


class CheckoutError(Exception):
    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)


def _coupon_eligible_items(coupon, items):
    """Cart items a scoped coupon actually applies to. An unscoped coupon
    (no products/categories set) applies to the whole cart."""
    if not coupon.products.exists() and not coupon.categories.exists():
        return items
    product_ids = set(coupon.products.values_list("id", flat=True))
    category_ids = set(coupon.categories.values_list("id", flat=True))
    return [
        item for item in items
        if item.product_id in product_ids or item.product.category_id in category_ids
    ]


def validate_coupon(code: str, user, subtotal: int, items: list):
    from apps.content.models import Coupon

    try:
        coupon = Coupon.objects.get(code__iexact=code, is_active=True)
    except Coupon.DoesNotExist:
        raise CheckoutError("کد تخفیف معتبر نیست.", field="coupon_code")

    now = timezone.now()
    if coupon.starts_at and now < coupon.starts_at:
        raise CheckoutError("این کد هنوز فعال نشده است.", field="coupon_code")
    if coupon.ends_at and now > coupon.ends_at:
        raise CheckoutError("این کد منقضی شده است.", field="coupon_code")
    if coupon.is_exhausted():
        raise CheckoutError("سقف استفاده از این کد پر شده است.", field="coupon_code")
    if subtotal < coupon.min_order_value:
        raise CheckoutError(
            f"حداقل مبلغ سفارش برای این کد {coupon.min_order_value:,} تومان است.", field="coupon_code"
        )
    if coupon.per_user_limit is not None and user is not None:
        used = Order.objects.filter(user=user, coupon=coupon).exclude(status="canceled").count()
        if used >= coupon.per_user_limit:
            raise CheckoutError("شما قبلاً از این کد استفاده کرده‌اید.", field="coupon_code")

    eligible_items = _coupon_eligible_items(coupon, items)
    eligible_subtotal = sum(item.product.price * item.quantity for item in eligible_items)
    if eligible_subtotal == 0:
        raise CheckoutError("این کد برای اقلام سبد شما قابل استفاده نیست.", field="coupon_code")

    if coupon.type == "percent":
        discount = eligible_subtotal * coupon.value // 100
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
    else:
        discount = min(coupon.value, eligible_subtotal)

    return coupon, discount


@transaction.atomic
def checkout(*, user, address, shipping_method, coupon_code: str | None = None, note: str = "") -> Order:
    """Creates a `pending` Order from the user's cart. Never deducts stock —
    that only happens in Order.mark_paid(). Prices are always read from the
    live Product row, never trusted from the cart or client."""
    cart = Cart.objects.filter(user=user).first()
    if not cart:
        raise CheckoutError("سبد خرید خالی است.", field="cart")

    items = list(cart.items.select_related("product", "color_option").all())
    if not items:
        raise CheckoutError("سبد خرید خالی است.", field="cart")

    for item in items:
        if not item.product.is_active:
            raise CheckoutError(f'"{item.product.name}" دیگر موجود نیست.', field="cart")
        if item.product.stock_count < item.quantity:
            raise CheckoutError(f"موجودی «{item.product.name}» کافی نیست.", field="cart")

    subtotal = sum(item.product.price * item.quantity for item in items)

    coupon = None
    discount = 0
    if coupon_code:
        coupon, discount = validate_coupon(coupon_code, user, subtotal, items)

    shipping_cost = shipping_method.cost
    if shipping_method.free_above is not None and subtotal >= shipping_method.free_above:
        shipping_cost = 0

    tax = 0  # no tax-rate configuration exists yet — field is here for when one does
    total = subtotal - discount + shipping_cost + tax

    order = Order.objects.create(
        user=user,
        shipping_address={
            "title": address.title,
            "province": address.province,
            "city": address.city,
            "line": address.line,
            "postalCode": address.postal_code,
            "receiverName": address.receiver_name,
            "receiverPhone": address.receiver_phone,
        },
        subtotal=subtotal,
        discount=discount,
        shipping_cost=shipping_cost,
        tax=tax,
        total=total,
        coupon=coupon,
        note=note,
    )

    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name=item.product.name,
            sku=item.product.sku,
            price=item.product.price,
            color_name=item.color_option.name if item.color_option else "",
            quantity=item.quantity,
        )

    if coupon:
        coupon.used_count = models.F("used_count") + 1
        coupon.save(update_fields=["used_count"])

    cart.items.all().delete()
    return order
