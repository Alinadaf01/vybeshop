import django_filters
from django.db.models import Q

from .models import Product


class ProductFilter(django_filters.FilterSet):
    # Query-string param names match API-CONTRACT.md exactly (camelCase) —
    # djangorestframework-camel-case only camelizes JSON bodies, not GET params.
    category = django_filters.CharFilter(field_name="category__slug")
    search = django_filters.CharFilter(method="filter_search")
    minPrice = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    maxPrice = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    inStock = django_filters.BooleanFilter(method="filter_in_stock")
    ordering = django_filters.OrderingFilter(fields=(("price", "price"), ("name", "name")))

    class Meta:
        model = Product
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(name__icontains=value) | Q(short_description__icontains=value))

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(stock_count__gt=0) if value else queryset
