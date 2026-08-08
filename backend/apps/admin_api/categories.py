from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.catalog.models import Category

from .activity import AdminActivityLogMixin
from .permissions import IsAdminStaff


class AdminCategorySerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "slug", "name", "description", "image", "parent", "order", "is_active"]

    def get_id(self, obj: Category) -> str:
        return str(obj.pk)

    def get_image(self, obj: Category) -> str | None:
        return obj.resolved_image_url or None

    def validate_parent(self, value: Category | None) -> Category | None:
        if value is not None and value.parent_id is not None:
            raise ValidationError("دسته‌بندی حداکثر می‌تواند دو سطح داشته باشد.")
        return value


class AdminCategoryListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()


class AdminCategoryDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()
