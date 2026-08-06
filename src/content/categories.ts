export const categoriesContent = {
  heading: "دسته‌بندی‌ها",
  subtitleTemplate: (categoryCount: number, productCount: number) =>
    `${categoryCount} دسته، ${productCount} قطعه. تقسیم‌بندی بر اساس جایی است که قطعه استفاده می‌شود، نه شکل آن.`,
  viewCategory: "دیدن دسته",
  featured: {
    kickerPrefix: "MOST BUILT",
    headingTemplate: (categoryName: string) => `${categoryName}، پرکارترین دسته`,
    linkTemplate: (count: number, categoryName: string) => `${count} محصول ${categoryName}`,
  },
  bestsellers: {
    heading: "پرفروش هر دسته",
    viewAll: "همه محصولات",
  },
} as const;
