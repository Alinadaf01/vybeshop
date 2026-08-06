import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { blogPosts } from "@/data/blog";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import type { BlogPost } from "@/types/blog";
import type { ContactMessage, ContactMessageInput } from "@/types/contact";
import type { PaginatedResponse } from "@/types/api";

const NETWORK_DELAY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS));
}

function paginate<T>(items: T[], page = 1, pageSize = 12): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const results = items.slice(start, start + pageSize);
  const hasNext = start + pageSize < items.length;
  const hasPrevious = page > 1;
  return {
    count: items.length,
    next: hasNext ? `page=${page + 1}` : null,
    previous: hasPrevious ? `page=${page - 1}` : null,
    results,
  };
}

export type ProductOrdering = "price" | "-price" | "name" | "-name";

export interface GetProductsParams {
  category?: string;
  search?: string;
  ordering?: ProductOrdering;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getProducts(
  params: GetProductsParams = {},
): Promise<PaginatedResponse<Product>> {
  let items = [...products];

  if (params.category) {
    items = items.filter((product) => product.category === params.category);
  }

  if (params.search) {
    const query = params.search.trim().toLowerCase();
    items = items.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.shortDescription.toLowerCase().includes(query),
    );
  }

  if (typeof params.minPrice === "number") {
    items = items.filter((product) => product.price >= params.minPrice!);
  }

  if (typeof params.maxPrice === "number") {
    items = items.filter((product) => product.price <= params.maxPrice!);
  }

  if (params.inStock) {
    items = items.filter((product) => product.inStock);
  }

  if (params.ordering) {
    const direction = params.ordering.startsWith("-") ? -1 : 1;
    const key = params.ordering.replace("-", "") as "price" | "name";
    items.sort((a, b) => {
      if (key === "price") return (a.price - b.price) * direction;
      return a.name.localeCompare(b.name) * direction;
    });
  }

  return delay(paginate(items, params.page, params.pageSize));
}

export async function getProduct(slug: string): Promise<Product> {
  const product = products.find((item) => item.slug === slug);
  if (!product) throw new Error(`Product not found: ${slug}`);
  return delay(product);
}

export async function getCategories(): Promise<Category[]> {
  return delay([...categories]);
}

export async function getCategory(slug: string): Promise<Category> {
  const category = categories.find((item) => item.slug === slug);
  if (!category) throw new Error(`Category not found: ${slug}`);
  return delay(category);
}

export interface GetBlogPostsParams {
  search?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export async function getBlogPosts(
  params: GetBlogPostsParams = {},
): Promise<PaginatedResponse<BlogPost>> {
  let items = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  if (params.search) {
    const query = params.search.trim().toLowerCase();
    items = items.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query),
    );
  }

  if (params.tag) {
    items = items.filter((post) => post.tags.includes(params.tag!));
  }

  return delay(paginate(items, params.page, params.pageSize));
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) throw new Error(`Blog post not found: ${slug}`);
  return delay(post);
}

export async function submitContactMessage(
  input: ContactMessageInput,
): Promise<ContactMessage> {
  const message: ContactMessage = {
    ...input,
    id: `msg-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };
  return delay(message);
}
