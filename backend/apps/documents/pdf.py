"""HTML -> PDF via headless Chromium (Playwright), per BACKEND-TASK.md §3.6 —
ReportLab/FPDF-style PDF libraries don't shape Arabic-script text or run the
bidi algorithm, so they mangle Persian. A real browser engine renders RTL and
Persian ligatures correctly because it's the same code path as an actual
browser tab.

A fresh browser instance is launched per call rather than kept warm across
requests — simpler and safe under Django's multi-process/multi-thread WSGI
workers, at the cost of ~300-500ms of Chromium startup per document. Fine for
per-order documents; list-style admin exports that could be slow run through
Celery (see apps/documents/tasks.py) so that cost never blocks a web worker.
"""

from pathlib import Path

from django.template.loader import render_to_string
from playwright.sync_api import sync_playwright

PUBLIC_FONTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "public" / "fonts"


def peyda_font_uri(weight_filename: str) -> str:
    return (PUBLIC_FONTS_DIR / "peyda" / weight_filename).as_uri()


def jetbrains_mono_font_uri(weight_filename: str) -> str:
    return (PUBLIC_FONTS_DIR / "jetbrains-mono" / weight_filename).as_uri()


def file_uri(path) -> str | None:
    """as_uri() for a Django FileField/ImageField value, or None if unset."""
    if not path:
        return None
    try:
        return Path(path.path).as_uri()
    except (ValueError, FileNotFoundError):
        return None


def render_pdf(template_name: str, context: dict, *, landscape: bool = False) -> bytes:
    html = render_to_string(template_name, context)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            pdf_bytes = page.pdf(
                format="A4",
                landscape=landscape,
                print_background=True,
                margin={"top": "14mm", "bottom": "16mm", "left": "12mm", "right": "12mm"},
            )
        finally:
            browser.close()
    return pdf_bytes
