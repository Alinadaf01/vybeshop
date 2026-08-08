from rest_framework.permissions import BasePermission


class IsAdminStaff(BasePermission):
    """Single global gate for the entire /api/admin/ surface — every view in
    this app uses this instead of DRF's IsAdminUser so the 403 message is
    consistent (see ADMIN-API-CONTRACT.md Conventions)."""

    message = "دسترسی به این بخش فقط برای کارکنان مجاز است."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
