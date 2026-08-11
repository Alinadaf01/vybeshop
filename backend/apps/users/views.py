import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.admin_api.activity import log_admin_action
from apps.notifications.services import NotificationService

from .models import Address, ImpersonationTicket, OTPCode, User
from .permissions import IsNotImpersonating
from .serializers import AddressSerializer, OtpRequestSerializer, OtpVerifySerializer, UserSerializer

IMPERSONATION_SESSION_MINUTES = 30


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

        cart_session_key = serializer.validated_data.get("cart_session_key")
        if cart_session_key:
            from apps.orders.services import merge_guest_cart_into_user

            merge_guest_cart_into_user(cart_session_key, user)

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


class ImpersonateConsumeView(APIView):
    """Public — the storefront's /impersonate route posts here with the
    ticket from its URL. Exchanges it for a real but restricted session:
    access token only (no refresh — the session simply dies at its natural
    expiry, it can't be extended), carrying an 'impersonated' claim that
    IsNotImpersonating checks on state-changing endpoints. This is the
    actual start of the support session — logged here, not when the admin
    merely requests a ticket (which might never get used)."""

    def post(self, request):
        raw_token = request.data.get("ticket", "")
        with transaction.atomic():
            # issued_by is a nullable FK (on_delete=SET_NULL) — Postgres
            # rejects SELECT ... FOR UPDATE with an outer join to a nullable
            # side, so it can't be in this select_related. Fetched normally
            # below instead, outside the lock (nothing needs to lock it).
            ticket = (
                ImpersonationTicket.objects.select_for_update()
                .select_related("target_user")
                .filter(token=raw_token)
                .first()
            )
            if ticket is None or not ticket.is_valid():
                return Response({"detail": "بلیط نامعتبر یا منقضی‌شده است."}, status=status.HTTP_400_BAD_REQUEST)
            ticket.used_at = timezone.now()
            ticket.save(update_fields=["used_at"])

        target = ticket.target_user
        access = AccessToken.for_user(target)
        access["impersonated"] = True
        access["impersonatorId"] = ticket.issued_by_id
        access.set_exp(lifetime=timedelta(minutes=IMPERSONATION_SESSION_MINUTES))

        log_admin_action(
            user=ticket.issued_by,
            action="impersonate_start",
            model_name="User",
            object_id=target.pk,
            changes={"impersonated_phone": target.phone},
        )

        return Response(
            {
                "access": str(access),
                "user": UserSerializer(target).data,
                "expiresInSeconds": IMPERSONATION_SESSION_MINUTES * 60,
            }
        )


class ImpersonateEndView(APIView):
    """Called by the support-mode banner's exit button, and automatically
    when the client-side session timer runs out. Best-effort: if this never
    fires (tab closed, network gone), the session still dies on its own at
    the access token's hard 30-minute expiry — there's no refresh token to
    extend it."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.auth
        if not token or not token.get("impersonated"):
            return Response({"detail": "این یک نشست پشتیبانی نیست."}, status=status.HTTP_400_BAD_REQUEST)

        impersonator = User.objects.filter(pk=token.get("impersonatorId")).first()
        log_admin_action(
            user=impersonator,
            action="impersonate_end",
            model_name="User",
            object_id=request.user.pk,
            changes={"impersonated_phone": request.user.phone},
        )
        return Response({"detail": "نشست پشتیبانی پایان یافت."})


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

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if self.request.method == "DELETE":
            permissions.append(IsNotImpersonating())
        return permissions
