import django_filters
from django.db.models import Q
from rest_framework import serializers
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response

from apps.users.models import Address, User

from .activity import AdminActivityLogMixin
from .permissions import IsAdminStaff


class AdminAddressSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = Address
        fields = ["id", "title", "province", "city", "line", "postal_code", "receiver_name", "receiver_phone", "is_default"]

    def get_id(self, obj: Address) -> str:
        return str(obj.pk)


class AdminUserListSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "last_name", "email", "is_verified", "is_active", "is_staff", "created_at"]

    def get_id(self, obj: User) -> str:
        return str(obj.pk)


class AdminUserDetailSerializer(AdminUserListSerializer):
    addresses = AdminAddressSerializer(many=True, read_only=True)
    order_count = serializers.SerializerMethodField()

    class Meta(AdminUserListSerializer.Meta):
        fields = AdminUserListSerializer.Meta.fields + ["addresses", "order_count"]

    def get_order_count(self, obj: User) -> int:
        return obj.orders.count()


class AdminCreateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["phone", "first_name", "last_name", "email", "is_verified"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AdminUserFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    isVerified = django_filters.BooleanFilter(field_name="is_verified")

    class Meta:
        model = User
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(phone__icontains=value) | Q(first_name__icontains=value) | Q(last_name__icontains=value))


class AdminUserListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [IsAdminStaff]
    filterset_class = AdminUserFilter
    queryset = User.objects.all()

    def get_serializer_class(self):
        return AdminCreateUserSerializer if self.request.method == "POST" else AdminUserListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(AdminUserDetailSerializer(serializer.instance).data, status=201)


class AdminUserDetailView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminUserDetailSerializer
    queryset = User.objects.prefetch_related("addresses")


class AdminUserAddressListView(ListAPIView):
    permission_classes = [IsAdminStaff]
    serializer_class = AdminAddressSerializer
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user_id=self.kwargs["user_id"])
