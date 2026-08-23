from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer

from .filters import BlogPostFilter
from .models import BlogPost, CatalogFile, CommunityTile, ContactMessage, Favorite, HeroSection, HomeShowcase
from .serializers import (
    BlogPostSerializer,
    CatalogFileSerializer,
    ContactMessageInputSerializer,
    ContactMessageOutputSerializer,
    PublicCommunityTileSerializer,
    PublicHeroSectionSerializer,
    PublicHomeShowcaseSerializer,
)


class BlogPostListView(ListAPIView):
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostSerializer
    filterset_class = BlogPostFilter


class BlogPostDetailView(RetrieveAPIView):
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostSerializer
    lookup_field = "slug"


class HomepageContentView(APIView):
    """GET /api/homepage/ — everything the home page's owner-editable
    sections need in one call, no pagination envelope (HOMEPAGE-ADMIN-TASK.md
    §2). `hero` is null both when it was never configured and when the
    owner explicitly turned it off — either way the frontend falls back to
    its own static default rather than showing an empty hero."""

    def get(self, request):
        hero = HeroSection.objects.filter(pk=1, is_active=True).first()
        showcases = HomeShowcase.objects.filter(is_active=True).select_related("product").order_by("order")[:2]
        tiles = CommunityTile.objects.filter(is_active=True).order_by("order")[:6]
        return Response(
            {
                "hero": PublicHeroSectionSerializer(hero).data if hero else None,
                "showcases": PublicHomeShowcaseSerializer(showcases, many=True).data,
                "community_tiles": PublicCommunityTileSerializer(tiles, many=True).data,
            }
        )


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class ContactMessageCreateView(CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageInputSerializer
    # No auth on this endpoint by design (anyone can contact the store), so
    # an IP-based cap is the only thing standing between it and spam
    # (§7.5 security review).
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact_form"

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


# Favorites are per-user only — guests keep their picks in localStorage on
# the frontend and merge/ them in on login, so every view here requires auth.

_PRODUCT_PREFETCH = ("images", "colors", "attributes__attribute", "attributes__value_option")


def _favorited_products_response(user, http_status=status.HTTP_200_OK) -> Response:
    product_ids = list(
        Favorite.objects.filter(user=user).order_by("-created_at").values_list("product_id", flat=True)
    )
    products = {
        p.pk: p
        for p in Product.objects.filter(pk__in=product_ids).select_related("category").prefetch_related(
            *_PRODUCT_PREFETCH
        )
    }
    ordered = [products[pid] for pid in product_ids if pid in products]
    return Response(ProductSerializer(ordered, many=True).data, status=http_status)


class FavoriteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _favorited_products_response(request.user)

    def post(self, request):
        product = get_object_or_404(Product, pk=request.data.get("product_id"))
        Favorite.objects.get_or_create(user=request.user, product=product)
        return _favorited_products_response(request.user, status.HTTP_201_CREATED)


class FavoriteDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, product_id):
        Favorite.objects.filter(user=request.user, product_id=product_id).delete()
        return _favorited_products_response(request.user)


class FavoriteMergeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_ids = request.data.get("product_ids") or []
        existing_ids = Product.objects.filter(pk__in=product_ids).values_list("pk", flat=True)
        Favorite.objects.bulk_create(
            [Favorite(user=request.user, product_id=pid) for pid in existing_ids],
            ignore_conflicts=True,
        )
        return _favorited_products_response(request.user)
