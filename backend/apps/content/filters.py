import django_filters
from django.db.models import Q

from .models import BlogPost


class BlogPostFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    tag = django_filters.CharFilter(method="filter_tag")
    category = django_filters.CharFilter(field_name="category")

    class Meta:
        model = BlogPost
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(excerpt__icontains=value))

    def filter_tag(self, queryset, name, value):
        return queryset.filter(tags__contains=[value])
