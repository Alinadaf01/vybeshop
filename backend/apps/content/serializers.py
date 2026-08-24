from rest_framework import serializers

from config.media import absolute_media_url

from .models import (
    BlogPost,
    CatalogEdition,
    CatalogFile,
    CatalogSpread,
    CommunityTile,
    ContactMessage,
    HeroSection,
    HomeShowcase,
)


class BlogPostSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "slug",
            "title",
            "excerpt",
            "category",
            "sections",
            "cover_image",
            "author",
            "author_role",
            "published_at",
            "tags",
            "reading_time",
        ]

    def get_id(self, obj: BlogPost) -> str:
        return str(obj.pk)

    def get_cover_image(self, obj: BlogPost) -> str:
        if obj.cover_image:
            return absolute_media_url(self.context.get("request"), obj.cover_image)
        return obj.external_cover_url


class ContactMessageInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["name", "email", "phone", "subject", "message", "newsletter"]

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("نام نمی‌تواند خالی باشد.")
        return value

    def validate_message(self, value: str) -> str:
        if len(value.strip()) < 10:
            raise serializers.ValidationError("پیام باید حداقل ۱۰ نویسه باشد.")
        return value


class ContactMessageOutputSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="tracking_code")

    class Meta:
        model = ContactMessage
        fields = ["id", "name", "email", "phone", "subject", "message", "newsletter", "submitted_at"]


class CatalogSpreadSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = CatalogSpread
        fields = ["id", "image", "caption"]

    def get_id(self, obj: CatalogSpread) -> str:
        return str(obj.pk)


class CatalogEditionSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.DecimalField(max_digits=6, decimal_places=1, coerce_to_string=False)

    class Meta:
        model = CatalogEdition
        fields = ["label", "is_current", "page_count", "file_size_mb", "file_url"]


class CatalogFileSerializer(serializers.ModelSerializer):
    spreads = CatalogSpreadSerializer(many=True, read_only=True)
    editions = CatalogEditionSerializer(many=True, read_only=True)
    file_size_mb = serializers.DecimalField(max_digits=6, decimal_places=1, coerce_to_string=False)

    class Meta:
        model = CatalogFile
        fields = [
            "title",
            "description",
            "format",
            "file_url",
            "file_size_mb",
            "page_count",
            "updated_at",
            "edition",
            "cover_image",
            "spreads",
            "editions",
        ]


class PublicHeroSectionSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    image_mobile = serializers.SerializerMethodField()

    class Meta:
        model = HeroSection
        fields = ["image", "image_mobile", "image_alt", "title", "subtitle", "caption", "cta_label", "cta_url"]

    def get_image(self, obj: HeroSection) -> str:
        return absolute_media_url(self.context.get("request"), obj.image)

    def get_image_mobile(self, obj: HeroSection) -> str:
        return absolute_media_url(self.context.get("request"), obj.image_mobile)


class PublicHomeShowcaseSerializer(serializers.ModelSerializer):
    """Read-only, resolved view — `image`/`title`/`cta_url` are the
    already-computed resolved_* properties (product fallback baked in), not
    the raw stored fields, so the frontend never has to replicate that
    fallback logic itself."""

    id = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    cta_url = serializers.SerializerMethodField()

    class Meta:
        model = HomeShowcase
        fields = [
            "id", "order", "product", "image", "image_alt", "title", "description",
            "specs", "cta_label", "cta_url", "theme",
        ]

    def get_id(self, obj: HomeShowcase) -> str:
        return str(obj.pk)

    def get_product(self, obj: HomeShowcase) -> dict | None:
        if not obj.product_id or not obj.product.is_active:
            return None
        return {"slug": obj.product.slug, "name": obj.product.name}

    def get_image(self, obj: HomeShowcase) -> str:
        # Mirrors HomeShowcase.resolved_image_url, but resolved by hand so
        # only the uploaded-file branches get absolutized — the product's
        # external_url fallback is a frontend-hosted static path and must
        # stay relative (config/media.py's docstring explains why).
        request = self.context.get("request")
        if obj.image:
            return absolute_media_url(request, obj.image)
        if obj._product_is_usable():
            primary = obj.product.images.first()
            if primary:
                if primary.image:
                    return absolute_media_url(request, primary.image)
                return primary.external_url
        return ""

    def get_title(self, obj: HomeShowcase) -> str:
        return obj.resolved_title

    def get_cta_url(self, obj: HomeShowcase) -> str:
        return obj.resolved_cta_url


class PublicCommunityTileSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = CommunityTile
        fields = ["id", "order", "image", "image_alt", "link_url"]

    def get_id(self, obj: CommunityTile) -> str:
        return str(obj.pk)

    def get_image(self, obj: CommunityTile) -> str:
        return absolute_media_url(self.context.get("request"), obj.image)
