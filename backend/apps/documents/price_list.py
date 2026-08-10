from django.db.models import QuerySet

from .context import base_context
from .persian import format_toman
from .tasks import render_pdf_async


def build_price_list_context(products: QuerySet, *, generated_by_name: str) -> dict:
    """For wholesale customers or printing — generated straight from the
    database, so it's never stale (BACKEND-TASK.md §3.6-ب: 'از همان دیتابیس
    تولید می‌شود، پس هرگز قدیمی نیست')."""
    ctx = base_context(doc_title="لیست قیمت", generated_by_name=generated_by_name)
    ctx["rows"] = [
        {
            "sku": product.sku,
            "name": product.name,
            "category": product.category.name if product.category_id else "",
            "price": format_toman(product.price),
        }
        for product in products
    ]
    return ctx


def render_price_list_pdf(products: QuerySet, *, generated_by_name: str) -> bytes:
    context = build_price_list_context(products, generated_by_name=generated_by_name)
    return render_pdf_async("documents/price_list.html", context)
