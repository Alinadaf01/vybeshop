from rest_framework import serializers

from config.media import absolute_media_url

from .models import Category, ColorOption, Product


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "slug", "name", "description", "image"]

    def get_id(self, obj: Category) -> str:
        return str(obj.pk)

    def get_image(self, obj: Category) -> str:
        if obj.image:
            return absolute_media_url(self.context.get("request"), obj.image)
        return obj.external_image_url


class ColorOptionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = ColorOption
        fields = ["id", "name", "hex", "in_stock"]

    def get_id(self, obj: ColorOption) -> str:
        return str(obj.pk)


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    colors = ColorOptionSerializer(many=True, read_only=True)
    dimensions = serializers.SerializerMethodField()
    layer_height = serializers.DecimalField(
        source="layer_height_mm", max_digits=4, decimal_places=2, coerce_to_string=False
    )
    weight = serializers.IntegerField(source="weight_g")
    in_stock = serializers.BooleanField(read_only=True)
    stock_count = serializers.IntegerField(read_only=True)
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "slug",
            "name",
            "short_description",
            "description",
            "price",
            "images",
            "category",
            "colors",
            "material",
            "dimensions",
            "weight",
            "layer_height",
            "in_stock",
            "stock_count",
            "specs",
        ]

    def get_id(self, obj: Product) -> str:
        return str(obj.pk)

    def get_images(self, obj: Product) -> list[str]:
        request = self.context.get("request")
        return [
            absolute_media_url(request, image.image) if image.image else image.external_url
            for image in obj.images.all()
        ]

    def get_dimensions(self, obj: Product) -> dict:
        return {"w": obj.width_mm, "h": obj.height_mm, "d": obj.depth_mm}

    def get_specs(self, obj: Product) -> list[dict]:
        specs = []
        for product_attribute in obj.attributes.select_related("attribute", "value_option").order_by(
            "attribute__order"
        ):
            spec = {
                "label": product_attribute.attribute.name,
                "value": product_attribute.display_value,
            }
            if product_attribute.attribute.unit:
                spec["unit"] = product_attribute.attribute.unit
            specs.append(spec)
        return specs
