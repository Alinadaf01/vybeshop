import secrets

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class Cart(models.Model):
    """Guest carts (session_key set, user null) merge into the user's cart on login."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, blank=True, null=True, related_name="carts"
    )
    session_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=models.Q(user__isnull=False), name="one_cart_per_user"),
            models.UniqueConstraint(
                fields=["session_key"],
                condition=models.Q(user__isnull=True) & ~models.Q(session_key=""),
                name="one_cart_per_guest_session",
            ),
        ]

    def __str__(self):
        return f"Cart({self.user or self.session_key})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="cart_items")
    color_option = models.ForeignKey(
        "catalog.ColorOption", on_delete=models.SET_NULL, blank=True, null=True, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ["cart", "product", "color_option"]

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


def generate_order_number() -> str:
    return f"VYBE-{timezone.now():%y%m%d}-{secrets.token_hex(3).upper()}"


ORDER_STATUS_CHOICES = [
    ("pending", "در انتظار پرداخت"),
    ("paid", "پرداخت‌شده"),
    ("processing", "در حال پردازش"),
    ("shipped", "ارسال‌شده"),
    ("delivered", "تحویل‌شده"),
    ("canceled", "لغوشده"),
    ("returned", "مرجوع‌شده"),
]

# Allowed forward transitions. Cancel/return are handled by dedicated methods
# with their own eligibility checks, not blind transitions.
_FORWARD_TRANSITIONS = {
    "pending": {"paid"},
    "paid": {"processing"},
    "processing": {"shipped"},
    "shipped": {"delivered"},
}
_CANCELABLE_FROM = {"pending", "paid", "processing"}
_RETURNABLE_FROM = {"delivered"}


class InvalidOrderTransition(Exception):
    pass


class Order(models.Model):
    number = models.CharField(max_length=30, unique=True, default=generate_order_number, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    # Snapshot, not a FK — a later edit/delete of the Address must not alter past orders.
    shipping_address = models.JSONField(
        default=dict, help_text="{title, province, city, line, postalCode, receiverName, receiverPhone}"
    )
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default="pending")

    subtotal = models.PositiveIntegerField(default=0)
    discount = models.PositiveIntegerField(default=0)
    shipping_cost = models.PositiveIntegerField(default=0)
    tax = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    coupon = models.ForeignKey(
        "content.Coupon", on_delete=models.SET_NULL, blank=True, null=True, related_name="orders"
    )

    note = models.TextField(blank=True)
    tracking_code = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.number

    def _transition(self, new_status: str, *, note: str = "", user=None, extra_fields: list[str] | None = None):
        if new_status not in _FORWARD_TRANSITIONS.get(self.status, set()) | {"canceled", "returned"}:
            raise InvalidOrderTransition(f"{self.status} -> {new_status} مجاز نیست.")
        previous = self.status
        self.status = new_status
        self.save(update_fields=["status", "updated_at", *(extra_fields or [])])
        OrderStatusLog.objects.create(
            order=self, from_status=previous, to_status=new_status, note=note, user=user
        )

    @transaction.atomic
    def mark_paid(self, *, user=None):
        """The only place stock leaves the ledger for a sale — never at order
        creation. Each StockMovement.record() call locks its product row
        (select_for_update), so concurrent payments can't oversell."""
        from apps.inventory.models import StockMovement

        if self.status != "pending":
            raise InvalidOrderTransition("فقط سفارش pending می‌تواند paid شود.")
        for item in self.items.select_related("product"):
            if item.product_id:
                StockMovement.objects.record(
                    item.product, "sale", item.quantity, reference=self.number, user=user
                )
        self.paid_at = timezone.now()
        self._transition("paid", user=user, extra_fields=["paid_at"])

    @transaction.atomic
    def start_processing(self, *, user=None):
        if self.status != "paid":
            raise InvalidOrderTransition("فقط سفارش paid می‌تواند processing شود.")
        self._transition("processing", user=user)

    @transaction.atomic
    def mark_shipped(self, *, tracking_code: str = "", user=None):
        if self.status != "processing":
            raise InvalidOrderTransition("فقط سفارش processing می‌تواند shipped شود.")
        self.tracking_code = tracking_code
        self.shipped_at = timezone.now()
        self._transition("shipped", note=tracking_code, user=user, extra_fields=["tracking_code", "shipped_at"])

    @transaction.atomic
    def mark_delivered(self, *, user=None):
        if self.status != "shipped":
            raise InvalidOrderTransition("فقط سفارش shipped می‌تواند delivered شود.")
        self._transition("delivered", user=user)

    @transaction.atomic
    def cancel(self, *, reason: str = "", user=None):
        from apps.inventory.models import StockMovement

        if self.status not in _CANCELABLE_FROM:
            raise InvalidOrderTransition(f"سفارش با وضعیت {self.status} قابل لغو نیست.")
        # Stock only left the ledger once the order reached "paid" (see
        # mark_paid) — "pending" never deducted anything, so only reverse
        # for the two statuses reachable after payment.
        if self.status in {"paid", "processing"}:
            for item in self.items.select_related("product"):
                if item.product_id:
                    StockMovement.objects.record(
                        item.product, "return_in", item.quantity, reference=self.number, user=user
                    )
        self._transition("canceled", note=reason, user=user)

    @transaction.atomic
    def mark_returned(self, *, user=None):
        from apps.inventory.models import StockMovement

        if self.status not in _RETURNABLE_FROM:
            raise InvalidOrderTransition(f"سفارش با وضعیت {self.status} قابل مرجوع‌شدن نیست.")
        for item in self.items.select_related("product"):
            if item.product_id:
                StockMovement.objects.record(
                    item.product, "return_in", item.quantity, reference=self.number, user=user
                )
        self._transition("returned", user=user)


class OrderStatusLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_logs")
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    note = models.CharField(max_length=255, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="order_status_changes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order.number}: {self.from_status} -> {self.to_status}"


class OrderItem(models.Model):
    """Snapshots product details at order time — immune to later product edits."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.SET_NULL, blank=True, null=True, related_name="order_items"
    )
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50)
    price = models.PositiveIntegerField()
    color_name = models.CharField(max_length=50, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"

    @property
    def subtotal(self) -> int:
        return self.price * self.quantity


PAYMENT_GATEWAY_CHOICES = [
    ("zarinpal", "زرین‌پال"),
    ("idpay", "آیدی‌پی"),
    ("snapppay", "اسنپ‌پی"),
    ("digipay", "دیجی‌پی"),
]

PAYMENT_STATUS_CHOICES = [
    ("pending", "در انتظار"),
    ("success", "موفق"),
    ("failed", "ناموفق"),
]


class Payment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    gateway = models.CharField(max_length=20, choices=PAYMENT_GATEWAY_CHOICES)
    amount = models.PositiveIntegerField()
    authority = models.CharField(max_length=100, blank=True)
    ref_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    raw_response = models.JSONField(blank=True, null=True)
    idempotency_key = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.order.number} — {self.gateway} ({self.status})"


RETURN_STATUS_CHOICES = [
    ("requested", "درخواست‌شده"),
    ("approved", "تأییدشده"),
    ("received", "دریافت‌شده"),
    ("refunded", "بازپرداخت‌شده"),
    ("rejected", "ردشده"),
]

_RETURN_TRANSITIONS = {
    "requested": {"approved", "rejected"},
    "approved": {"received"},
    "received": {"refunded"},
}


class Return(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="returns")
    items = models.ManyToManyField(OrderItem, related_name="returns", blank=True)
    status = models.CharField(max_length=20, choices=RETURN_STATUS_CHOICES, default="requested")
    reason = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Return({self.order.number}, {self.status})"

    def _transition(self, new_status: str):
        if new_status not in _RETURN_TRANSITIONS.get(self.status, set()):
            raise InvalidOrderTransition(f"{self.status} -> {new_status} مجاز نیست.")
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])

    def approve(self):
        self._transition("approved")

    def reject(self):
        self._transition("rejected")

    def mark_received(self):
        self._transition("received")

    @transaction.atomic
    def mark_refunded(self):
        self._transition("refunded")
