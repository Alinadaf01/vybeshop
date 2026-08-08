export const cartContent = {
  seo: { title: "سبد خرید", description: "سبد خرید شما در VYBE." },
  breadcrumbLabel: "سبد خرید",
  heading: "سبد خرید",
  itemsCountTemplate: (items: number, pieces: number) => `${items} قلم، ${pieces} عدد`,
  continueShoppingLink: "ادامه خرید",
  clearCart: "خالی کردن سبد",
  remove: "حذف",
  summary: {
    heading: "خلاصه سفارش",
    subtotalLabel: "جمع کالاها",
    checkoutCta: "ادامه و تسویه",
  },
  shippingNote: {
    kicker: "SHIPPING · RETURNS",
    body: "ارسال ۲ تا ۴ روز کاری. مرجوعی ۷ روزه بدون قید. قطعه‌های چاپ‌شده به سفارش مشمول مرجوعی نیستند.",
  },
  empty: {
    heading: "سبد خرید خالی است",
    body: "هنوز چیزی اضافه نکرده‌اید. محصولات را ببینید و شروع کنید.",
    productsCta: "دیدن محصولات",
    categoriesCta: "دسته‌بندی‌ها",
  },
  error: {
    heading: "سبد خرید بارگذاری نشد",
    body: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
    retry: "تلاش دوباره",
  },
  outOfStock: "ناموجود",
  inStock: "موجود در انبار",
  mobileBar: {
    payableLabel: "مبلغ قابل پرداخت",
    checkoutCta: "تسویه",
  },
};
