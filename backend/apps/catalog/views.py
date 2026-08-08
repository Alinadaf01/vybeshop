from rest_framework.generics import ListAPIView, RetrieveAPIView

from .filters import ProductFilter
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class ProductListView(ListAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related(
        "images", "colors", "attributes__attribute", "attributes__value_option"
    )
    serializer_class = ProductSerializer
    filterset_class = ProductFilter


class ProductDetailView(RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related(
        "images", "colors", "attributes__attribute", "attributes__value_option"
    )
    serializer_class = ProductSerializer
    lookup_field = "slug"


class CategoryListView(ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    pagination_class = None


class CategoryDetailView(RetrieveAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = "slug"
