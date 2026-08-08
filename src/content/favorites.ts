export const favoritesContent = {
  toast: {
    error: "به‌روزرسانی علاقه‌مندی‌ها ناموفق بود.",
  },
  account: {
    heading: "علاقه‌مندی‌ها",
    countTemplate: (n: number) => `${n} محصول ذخیره‌شده`,
    removeAriaTemplate: (name: string) => `حذف ${name} از علاقه‌مندی‌ها`,
    loading: "در حال بارگذاری…",
    loadError: "دریافت علاقه‌مندی‌ها ناموفق بود.",
    retry: "تلاش دوباره",
    empty: {
      heading: "هنوز چیزی ذخیره نکرده‌اید",
      body: "محصولی که دوست دارید را با دکمه «ذخیره در علاقه‌مندی‌ها» همین‌جا نگه دارید.",
      cta: "دیدن محصولات",
    },
  },
} as const;
