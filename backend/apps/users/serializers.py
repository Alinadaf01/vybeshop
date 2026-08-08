from rest_framework import serializers

from .models import Address, User, phone_validator


class UserSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "last_name", "email", "is_verified", "created_at"]
        read_only_fields = ["phone", "is_verified", "created_at"]

    def get_id(self, obj: User) -> str:
        return str(obj.pk)


class AddressSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = Address
        fields = [
            "id",
            "title",
            "province",
            "city",
            "line",
            "postal_code",
            "receiver_name",
            "receiver_phone",
            "is_default",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_id(self, obj: Address) -> str:
        return str(obj.pk)


class OtpRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[phone_validator])


class OtpVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[phone_validator])
    code = serializers.CharField(min_length=6, max_length=6)
