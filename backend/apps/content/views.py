from django.http import Http404
from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.response import Response

from .filters import BlogPostFilter
from .models import BlogPost, CatalogFile, ContactMessage
from .serializers import (
    BlogPostSerializer,
    CatalogFileSerializer,
    ContactMessageInputSerializer,
    ContactMessageOutputSerializer,
)


class BlogPostListView(ListAPIView):
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostSerializer
    filterset_class = BlogPostFilter


class BlogPostDetailView(RetrieveAPIView):
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostSerializer
    lookup_field = "slug"


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class ContactMessageCreateView(CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageInputSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(ip_address=_client_ip(request))
        output = ContactMessageOutputSerializer(message)
        return Response(output.data, status=status.HTTP_201_CREATED)


class CatalogFileDetailView(RetrieveAPIView):
    serializer_class = CatalogFileSerializer

    def get_object(self):
        obj = CatalogFile.load()
        if obj is None:
            raise Http404("Catalog not configured yet.")
        return obj
