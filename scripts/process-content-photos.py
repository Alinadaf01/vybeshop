"""One-off script for CONTENT-TASK.md §1 — converts Photos/* into the
project's image pipeline: renamed English filenames, JPEG originals (kept
as the <img> fallback), and WebP srcset variants at widths <= the source's
native width only (never upscale, per task note). Admin-uploaded images
(hero, showcase blocks, community tiles) are exported to a separate
directory instead of public/, since those go through the Homepage admin
API, not the static asset pipeline.
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "Photos")
PUBLIC_IMAGES = os.path.join(ROOT, "public", "images")
ADMIN_UPLOADS = os.path.join(ROOT, "scripts", "_admin-upload-photos")

WIDTHS = [400, 800, 1200]
JPEG_QUALITY = 85
WEBP_QUALITY = 82


def save_static(src_filename, dest_relpath):
    """Resize/compress src into public/images/<dest_relpath>.jpg plus WebP
    variants at widths <= native width (no upscaling)."""
    src_path = os.path.join(PHOTOS, src_filename)
    im = Image.open(src_path)
    if im.mode in ("RGBA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.convert("RGBA").split()[-1] if im.mode == "RGBA" else None)
        im = bg
    else:
        im = im.convert("RGB")
    native_w = im.width

    dest_abs_noext = os.path.join(PUBLIC_IMAGES, dest_relpath)
    os.makedirs(os.path.dirname(dest_abs_noext), exist_ok=True)

    im.save(dest_abs_noext + ".jpg", "JPEG", quality=JPEG_QUALITY, optimize=True)

    made = []
    for w in WIDTHS:
        if w > native_w:
            continue
        h = round(im.height * (w / native_w))
        variant = im.resize((w, h), Image.LANCZOS)
        variant.save(f"{dest_abs_noext}-{w}.webp", "WEBP", quality=WEBP_QUALITY)
        made.append(w)
    print(f"{src_filename} ({native_w}x{im.height}) -> {dest_relpath}.jpg + webp{made}")


def save_for_admin_upload(src_filename, dest_filename, max_width=None):
    """Light compression only, saved outside public/ for the admin-API
    upload step — Django doesn't serve pre-generated WebP variants."""
    src_path = os.path.join(PHOTOS, src_filename)
    im = Image.open(src_path)
    if im.mode in ("RGBA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.convert("RGBA").split()[-1] if im.mode == "RGBA" else None)
        im = bg
    else:
        im = im.convert("RGB")
    if max_width and im.width > max_width:
        h = round(im.height * (max_width / im.width))
        im = im.resize((max_width, h), Image.LANCZOS)

    os.makedirs(ADMIN_UPLOADS, exist_ok=True)
    dest_path = os.path.join(ADMIN_UPLOADS, dest_filename)
    im.save(dest_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
    print(f"{src_filename} ({im.width}x{im.height}) -> [admin upload] {dest_filename}")


# --- Products (9) ---------------------------------------------------------
PRODUCT_LETTERS = "abcdefghi"
for i, letter in enumerate(PRODUCT_LETTERS, start=1):
    save_static(f"product {i}.PNG", f"products/product-{letter}/1")

# --- Categories (8) --------------------------------------------------------
for i in range(1, 9):
    save_static(f"categori {i}.PNG", f"categories/category-{i}")

# --- Marketing ---------------------------------------------------------
save_static(
    "ماکرو خطوط لایه‌ای، تمام‌عرض — نور کناری تند، عمق میدان کم صفحه هوم.PNG",
    "marketing/macro-layer-lines",
)
save_static("عکس کارگاه درباره ما.PNG", "marketing/workshop-wide")

# --- About page --------------------------------------------------------
save_static("عکس ماکرو سطح قطعه.PNG", "about/macro-surface")
save_static("about us 1 PRINT FARM.PNG", "about/workshop-1")
save_static("about us 2 QC TABLE.PNG", "about/workshop-2")
save_static("about us 3 FILAMENT.PNG", "about/workshop-3")
save_static("about us 4 PACKING.PNG", "about/workshop-4")

# --- Admin-uploaded (hero, showcase blocks, community tiles) --------------
save_for_admin_upload("عکس هیرو قهرمان.jpg", "hero.jpg")
save_for_admin_upload("عکس محصول هیرو 1.PNG", "showcase-1.jpg")
save_for_admin_upload("عکس محصول هیرو 2.PNG", "showcase-2.jpg")
for i in range(1, 7):
    save_for_admin_upload(f"جامعه وایب {i}.PNG", f"community-{i}.jpg")

# Also save static copies of the hero + community photos under public/ —
# these back src/content/home.ts's hardcoded fallback (HOMEPAGE-ADMIN-TASK.md's
# "static default preserved" rule), used only if the admin-managed records
# are ever inactive/unreachable, so that fallback path is never a 404.
save_static("عکس هیرو قهرمان.jpg", "marketing/hero")
for i in range(1, 7):
    save_static(f"جامعه وایب {i}.PNG", f"community/{i}")

print("done.")
