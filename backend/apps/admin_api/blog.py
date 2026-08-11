from djangorestframework_camel_case.parser import CamelCaseFormParser, CamelCaseJSONParser, CamelCaseMultiPartParser
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView

from apps.content.models import BlogPost

from .activity import AdminActivityLogMixin
from .permissions import require_section


class AdminBlogPostSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    # `cover_image` (the real ImageField) is writable so the admin panel can
    # upload a file; `resolved_cover_url` is read-only and falls back to
    # `external_cover_url` for older/seeded posts that only have that set —
    # the panel uses it to preview an image even before one is uploaded.
    resolved_cover_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id", "slug", "title", "excerpt", "category", "sections", "cover_image", "resolved_cover_url",
            "author", "author_role", "tags", "reading_time", "is_published",
            "meta_title", "meta_description", "published_at",
        ]

    def get_id(self, obj: BlogPost) -> str:
        return str(obj.pk)

    def get_resolved_cover_url(self, obj: BlogPost) -> str:
        return obj.resolved_cover_url


class AdminBlogPostListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("blog")]
    serializer_class = AdminBlogPostSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = BlogPost.objects.all()


class AdminBlogPostDetailView(AdminActivityLogMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("blog")]
    serializer_class = AdminBlogPostSerializer
    parser_classes = [CamelCaseMultiPartParser, CamelCaseFormParser, CamelCaseJSONParser]
    queryset = BlogPost.objects.all()
