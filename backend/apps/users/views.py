import secrets

from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.notifications.services import NotificationService

from .models import Address, OTPCode, User
from .serializers import AddressSerializer, OtpRequestSerializer, OtpVerifySerializer, UserSerializer


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


class RequestOtpView(APIView):
    def post(self, request):
        serializer = OtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        window_start = timezone.now() - timezone.timedelta(minutes=OTPCode.RATE_LIMIT_MINUTES)
        recent_count = OTPCode.objects.filter(phone=phone, created_at__gte=window_start).count()
        if recent_count >= OTPCode.RATE_LIMIT_COUNT:
            return Response(
                {"detail": "تعداد درخواست بیش از حد مجاز است. چند دقیقه دیگر دوباره تلاش کنید."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = _generate_code()
        OTPCode.issue(phone, code)
        NotificationService.send_sms(phone, "otp_login", {"code": code})

        return Response({"expiresInSeconds": OTPCode.EXPIRY_MINUTES * 60})


class VerifyOtpView(APIView):
    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]

        otp = OTPCode.objects.filter(phone=phone).order_by("-created_at").first()
        if not otp or not otp.verify(code):
            return Response(
                {"detail": "کد وارد‌شده اشتباه یا منقضی است."}, status=status.HTTP_400_BAD_REQUEST
            )

        user, created = User.objects.get_or_create(phone=phone, defaults={"is_verified": True})
        if not created and not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "isNewUser": created,
            }
        )


class MeView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AddressListCreateView(ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # a user's address count is always small — plain array, not paginated

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AddressDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
