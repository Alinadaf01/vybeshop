from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import BlogPost

from .activity import AdminActivityLogMixin
from .permissions import IsAdminStaff


class AdminBlogPostSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id", "slug", "title", "excerpt", "category", "sections", "cover_image",
            "author", "author_role", "tags", "reading_time", "is_published",
            "meta_title", "meta_description", "published_at",
        ]

    def get_id(self, obj: BlogPost) -> str:
        return str(obj.pk)

    def get_cover_image(self, obj: BlogPost) -> str:
        return obj.resolved_cover_url


class AdminBlogPostListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminBlogPostSerializer
    queryset = BlogPost.objects.all()


class AdminBlogPostDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminBlogPostSerializer
    queryset = BlogPost.objects.all()
