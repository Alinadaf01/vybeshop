from rest_framework import serializers

from .models import BlogPost, CatalogEdition, CatalogFile, CatalogSpread, ContactMessage


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
        return obj.resolved_cover_url


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
