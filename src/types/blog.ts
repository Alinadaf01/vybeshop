export type BlogCategory = "محصول" | "طراحی" | "آموزش" | "سبک زندگی" | "جامعه";

export interface BlogSection {
  id: string;
  heading: string;
  body: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  sections: BlogSection[];
  /** رشته خالی وقتی هیچ عکس واقعیِ بدون گرافیک متن‌دار موجود نیست — همسو با
   * external_cover_url بک‌اند (CharField با blank=True، نه null) — Image
   * به‌صورت خودکار جای‌نگهدار نشان می‌دهد (FIX-TASK.md دور دوم). */
  coverImage: string;
  author: string;
  authorRole: string;
  publishedAt: string;
  tags: string[];
  readingTime: number;
}
