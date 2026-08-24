"""One-off script for CONTENT-TASK.md §1 — uploads the real hero, showcase
block, and community tile photos through the already-built Homepage admin
API (not the static asset pipeline), matching the task's explicit
"از پنل ادمین وارد شود" instruction for these three sections."""

import os
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "scripts", "_admin-upload-photos")
BASE = "http://localhost:8000/api/admin"

session = requests.Session()
resp = session.post(f"{BASE}/auth/login/", json={"phone": "09127484925", "password": "Ali123123"})
resp.raise_for_status()
token = resp.json()["access"]
session.headers["Authorization"] = f"Bearer {token}"


def patch_hero():
    with open(os.path.join(PHOTOS, "hero.jpg"), "rb") as f:
        data = {
            "imageAlt": "شیء تزئینی چاپ سه‌بعدی روی زمینه گرم نارنجی، نور دراماتیک از کنار",
            "title": "هر قطعه، وایبتو عوض می‌کنه",
            "subtitle": "دنیایی که هر روز باهاش زندگی می‌کنی.",
            "caption": "PLA · FDM · 0.2MM LAYER",
            "ctaLabel": "کاوش محصولات",
            "ctaUrl": "/products",
            "isActive": "true",
        }
        r = session.patch(f"{BASE}/homepage/hero/", data=data, files={"image": f})
    r.raise_for_status()
    print("hero:", r.status_code, r.json().get("image"))


def create_showcase(order, filename, title, image_alt, theme):
    with open(os.path.join(PHOTOS, filename), "rb") as f:
        data = {
            "order": str(order),
            "imageAlt": image_alt,
            "title": title,
            "description": "توضیح این بلوک بعداً از پنل ادمین تکمیل می‌شود.",
            "specs": "[]",
            "ctaLabel": "مشاهده محصولات",
            "ctaUrl": "/products",
            "theme": theme,
            "isActive": "true",
        }
        r = session.post(f"{BASE}/homepage/showcases/", data=data, files={"image": f})
    r.raise_for_status()
    print(f"showcase {order}:", r.status_code, r.json().get("image"))


def create_community_tile(order, filename, image_alt):
    with open(os.path.join(PHOTOS, filename), "rb") as f:
        data = {"order": str(order), "imageAlt": image_alt, "isActive": "true"}
        r = session.post(f"{BASE}/homepage/community-tiles/", data=data, files={"image": f})
    r.raise_for_status()
    print(f"community tile {order}:", r.status_code, r.json().get("image"))


patch_hero()
create_showcase(1, "showcase-1.jpg", "بلوک نمایش ۱", "جعبه ایمنی مشکی مات با قفل رمزی روی زمینه خاکستری", "light")
create_showcase(2, "showcase-2.jpg", "بلوک نمایش ۲", "شیء چاپ سه‌بعدی سفید با فرم انشعابی، نور گرم روی چوب", "dark")

community_alts = [
    "شیء چاپ سه‌بعدی سبز رنگ روی میز چوبی، نور گرم",
    "صحنه اتاق‌خواب با چراغ دیواری و رومیزی سبز، نور کم",
    "جاکلیدی دیواری سبز و آویز کلید روی میز چوبی",
    "پایه موبایل، لیوان قلم و اسپیکر سبز روی میز کار",
    "فرفره و اسباب‌بازی حسی سبز روی میز چوبی، نور گرم",
    "ماشین اسباب‌بازی و کنترل از راه دور سبز روی میز چوبی",
]
for i, alt in enumerate(community_alts, start=1):
    create_community_tile(i, f"community-{i}.jpg", alt)

print("done.")
