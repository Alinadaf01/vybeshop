import type { BlogCategory } from "@/types/blog";

export const blogCategories: BlogCategory[] = ["محصول", "طراحی", "آموزش", "سبک زندگی", "جامعه"];

export const blogListContent = {
  heading: "یادداشت‌های کارگاه",
  subtitle: "تصمیم‌های طراحی، پارامترهای چاپ و چیزهایی که در تولید یاد گرفتیم. بدون تبلیغ.",
  featured: {
    badge: "شاخص",
    readMore: "خواندن مقاله",
  },
  filters: {
    all: "همه",
  },
  resultsTemplate: (shown: number, total: number) => `${shown} نوشته از ${total}`,
  readMore: "خواندن",
  empty: {
    title: "نوشته‌ای پیدا نشد",
    description: "هنوز نوشته‌ای در این دسته منتشر نشده است.",
    action: "دیدن همه نوشته‌ها",
  },
  error: {
    title: "فهرست نوشته‌ها بارگذاری نشد",
    description: "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
    code: "ERR_BLOG_LIST",
    action: "تلاش مجدد",
  },
};
