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
  coverImage: string;
  author: string;
  authorRole: string;
  publishedAt: string;
  tags: string[];
  readingTime: number;
}
