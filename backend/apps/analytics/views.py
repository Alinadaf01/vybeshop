import hashlib
from datetime import date

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import PageViewInputSerializer
from .tasks import record_page_view

EXCLUDED_PREFIXES = ("/api/", "/admin/", "/static/", "/media/")


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _visitor_hash(ip: str, user_agent: str) -> str:
    # Daily-salted, no cookie, no raw IP ever persisted (see PageView docstring).
    salt = f"{date.today().isoformat()}:{settings.SECRET_KEY[:16]}"
    return hashlib.sha256(f"{ip}{user_agent}{salt}".encode()).hexdigest()


class PageViewCreateView(APIView):
    """Called by the frontend on navigation — Django never serves the
    storefront's pages itself (see PageView's docstring), so this endpoint
    is the SPA equivalent of the page-request middleware BACKEND-TASK.md
    describes."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PageViewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["path"].startswith(EXCLUDED_PREFIXES):
            return Response(status=status.HTTP_204_NO_CONTENT)

        user_agent = request.META.get("HTTP_USER_AGENT", "")
        visitor_hash = _visitor_hash(_client_ip(request), user_agent)

        record_page_view.delay(
            path=data["path"],
            visitor_hash=visitor_hash,
            referrer=data.get("referrer", ""),
            user_agent=user_agent,
            product_slug=data.get("product_slug") or None,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
