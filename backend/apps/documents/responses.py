from django.http import HttpResponse
from django.utils import timezone


def pdf_filename(base: str) -> str:
    """ISO date in the filename, Jalali date inside the document itself —
    BACKEND-TASK.md §3.6: 'تاریخ شمسی در سند، ISO در نام فایل'."""
    return f"{base}-{timezone.localdate().isoformat()}.pdf"


def pdf_response(pdf_bytes: bytes, filename: str) -> HttpResponse:
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
