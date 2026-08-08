from rest_framework import serializers

from apps.catalog.models import ColorOption, Product

from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog, Payment


class CartProductSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "slug", "name", "sku", "price", "image", "in_stock", "stock_count"]

    def get_id(self, obj: Product) -> str:
        return str(obj.pk)

    def get_image(self, obj: Product) -> str | None:
        first = obj.images.order_by("order").first()
        return first.resolved_url if first else None


class CartColorOptionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ColorOption
        fields = ["id", "name", "hex", "in_stock"]

    def get_id(self, obj: ColorOption) -> str:
        return str(obj.pk)


class CartItemSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    product = CartProductSerializer(read_only=True)
    color_option = CartColorOptionSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "color_option", "quantity", "line_total"]

    def get_id(self, obj: CartItem) -> str:
        return str(obj.pk)

    def get_line_total(self, obj: CartItem) -> int:
        return obj.product.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "item_count", "subtotal"]

    def get_id(self, obj: Cart) -> str:
        return str(obj.pk)

    def get_item_count(self, obj: Cart) -> int:
        return sum(item.quantity for item in obj.items.all())

    def get_subtotal(self, obj: Cart) -> int:
        return sum(item.product.price * item.quantity for item in obj.items.all())


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    color_option_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_product_id(self, value: int) -> int:
        if not Product.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError("محصول یافت نشد.")
        return value

    def validate(self, attrs):
        color_id = attrs.get("color_option_id")
        if color_id is not None and not ColorOption.objects.filter(pk=color_id, product_id=attrs["product_id"]).exists():
            raise serializers.ValidationError({"color_option_id": "این رنگ برای این محصول معتبر نیست."})
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class CheckoutInputSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    shipping_method_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")


# --- Orders (read-only, for the account page's order history) ---


class OrderItemSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    subtotal = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product_name", "sku", "price", "color_name", "quantity", "subtotal"]

    def get_id(self, obj: OrderItem) -> str:
        return str(obj.pk)


class OrderStatusLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusLog
        fields = ["from_status", "to_status", "note", "user", "created_at"]

    def get_user(self, obj: OrderStatusLog) -> str | None:
        return obj.user.phone if obj.user else None


class PaymentSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ["id", "gateway", "amount", "ref_id", "status", "created_at", "verified_at"]

    def get_id(self, obj: Payment) -> str:
        return str(obj.pk)


class OrderListSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "number", "status", "total", "item_count", "created_at", "paid_at"]

    def get_id(self, obj: Order) -> str:
        return str(obj.pk)

    def get_item_count(self, obj: Order) -> int:
        return sum(item.quantity for item in obj.items.all())


class OrderDetailSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "number",
            "status",
            "shipping_address",
            "subtotal",
            "discount",
            "shipping_cost",
            "tax",
            "total",
            "note",
            "tracking_code",
            "items",
            "payments",
            "status_logs",
            "created_at",
            "paid_at",
            "shipped_at",
        ]

    def get_id(self, obj: Order) -> str:
        return str(obj.pk)
