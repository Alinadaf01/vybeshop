export const productsContent = {
  heading: "همه محصولات",
  subtitleTemplate: (count: number) =>
    `${count} قطعه، همه در کارگاه خودمان چاپ و بازرسی می‌شوند. مشخصات فنی هر قطعه کامل ذکر شده است.`,
  searchPlaceholder: "جستجوی محصول…",
  searchLabel: "جستجوی محصول",
  resultsTemplate: (shown: number, total: number) => `${shown} محصول از ${total}`,
  filters: {
    title: "فیلترها",
    kicker: "FILTERS",
    clearAll: "حذف همه",
    category: "دسته‌بندی",
    price: "قیمت",
    availability: "موجودی",
    inStockOnly: "فقط کالاهای موجود",
    openButton: "فیلترها",
  },
  activeFilters: {
    priceRangeTemplate: (min: string, max: string) => `${min} — ${max}`,
    inStockChip: "فقط موجود",
  },
  sort: [
    { value: "", label: "پیش‌فرض" },
    { value: "-price", label: "گران‌ترین" },
    { value: "price", label: "ارزان‌ترین" },
    { value: "name", label: "نام (الف تا ی)" },
  ],
  empty: {
    title: "نتیجه‌ای نبود",
    description: "فیلترها را ساده‌تر کنید یا همه محصولات را ببینید.",
    action: "حذف فیلترها",
  },
  error: {
    title: "بارگذاری انجام نشد",
    description: "اتصال قطع شد. یک بار دیگر تلاش کنید.",
    action: "تلاش دوباره",
    code: "ERR_FETCH_PRODUCTS",
  },
} as const;
