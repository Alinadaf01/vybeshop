from django.utils import timezone

from apps.settings.models import SiteSettings

from .pdf import file_uri, jetbrains_mono_font_uri, peyda_font_uri
from .persian import format_jalali_date


def base_context(*, doc_title: str, generated_by_name: str, filter_summary: str = "") -> dict:
    """Shared header/font context every document template needs — see
    apps/documents/templates/documents/base.html."""
    settings_obj = SiteSettings.load()
    return {
        "doc_title": doc_title,
        "filter_summary": filter_summary,
        "generated_at": format_jalali_date(timezone.localtime(timezone.now())),
        "generated_by": generated_by_name,
        "business_name": settings_obj.business_name or "VYBE",
        "seller_address": settings_obj.address,
        "logo_uri": file_uri(settings_obj.logo_light),
        "font_regular": peyda_font_uri("Peyda-Regular.woff2"),
        "font_medium": peyda_font_uri("Peyda-Medium.woff2"),
        "font_semibold": peyda_font_uri("Peyda-SemiBold.woff2"),
        "font_bold": peyda_font_uri("Peyda-Bold.woff2"),
        "mono_regular": jetbrains_mono_font_uri("JetBrainsMono-Regular.woff2"),
        "mono_bold": jetbrains_mono_font_uri("JetBrainsMono-Bold.woff2"),
    }
