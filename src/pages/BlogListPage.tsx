import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBlogPosts } from "@/lib/api";
import { blogPosts } from "@/data/blog";
import type { BlogCategory } from "@/types/blog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { formatJalaliDate } from "@/lib/formatters";
import { blogListContent as c, blogCategories } from "@/content/blog";

const PAGE_SIZE = 9;

const featuredPost = [...blogPosts].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
)[0];

function readingTimeTemplate(minutes: number) {
  return `${minutes} دقیقه`;
}

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = (searchParams.get("category") as BlogCategory | null) ?? undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;

  function updateParams(patch: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["blog-posts", { category, page }],
    queryFn: () => getBlogPosts({ category, page, pageSize: PAGE_SIZE }),
  });

  const pageCount = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.heading }]} />

      <div className="flex flex-col gap-4 pb-12">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        <p className="m-0 max-w-text text-body-large text-gray-800 [text-wrap:pretty]">{c.subtitle}</p>
      </div>

      <section className="pb-14 md:pb-20">
        <Link
          to={`/blog/${featuredPost.slug}`}
          className="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <Image
            src={featuredPost.coverImage}
            alt={featuredPost.title}
            width={1600}
            height={1000}
            priority
            className="min-h-[280px] w-full object-cover"
          />
          <span className="flex flex-col justify-center gap-4 p-6 md:p-12">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="solid">{c.featured.badge}</Badge>
              <Badge variant="neutral">{featuredPost.category}</Badge>
              <span dir="ltr" className="font-mono text-micro text-gray-800">
                {formatJalaliDate(featuredPost.publishedAt)} &middot; {readingTimeTemplate(featuredPost.readingTime)}
              </span>
            </span>
            <span className="text-h2 font-bold leading-tight text-graphite [text-wrap:pretty]">
              {featuredPost.title}
            </span>
            <span className="text-body leading-[1.7] text-gray-800 [text-wrap:pretty]">{featuredPost.excerpt}</span>
            <span className="mt-2 self-start border-b border-silver pb-1 text-body font-medium text-graphite">
              {c.featured.readMore}
            </span>
          </span>
        </Link>
      </section>

      <section className="flex flex-col gap-8 border-t border-gray-100 py-14 md:py-20">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => updateParams({ category: undefined })}
            className={
              category
                ? "h-11 rounded-full border border-silver bg-white px-6 text-small font-medium text-graphite transition-colors duration-fast hover:border-titanium"
                : "h-11 rounded-full border-0 bg-graphite px-6 text-small font-medium text-fog-white"
            }
          >
            {c.filters.all}
          </button>
          {blogCategories.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => updateParams({ category: option })}
              className={
                category === option
                  ? "h-11 rounded-full border-0 bg-graphite px-6 text-small font-medium text-fog-white"
                  : "h-11 rounded-full border border-silver bg-white px-6 text-small font-medium text-graphite transition-colors duration-fast hover:border-titanium"
              }
            >
              {option}
            </button>
          ))}
          <span className="ms-auto text-small text-gray-800">
            {data ? c.resultsTemplate(data.results.length, data.count) : "…"}
          </span>
        </div>

        {isError ? (
          <ErrorState
            title={c.error.title}
            description={c.error.description}
            errorCode={c.error.code}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                {c.error.action}
              </Button>
            }
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <Skeleton key={i} className="aspect-[16/13] rounded-lg" />
            ))}
          </div>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.results.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="flex flex-col overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
                >
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    width={800}
                    height={500}
                    className="aspect-[16/10] w-full border-b border-gray-100 object-cover"
                  />
                  <span className="flex flex-1 flex-col gap-2 p-4">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{post.category}</Badge>
                      <span dir="ltr" className="font-mono text-micro text-gray-800">
                        {formatJalaliDate(post.publishedAt)} &middot; {readingTimeTemplate(post.readingTime)}
                      </span>
                    </span>
                    <span className="text-h4 font-bold leading-[1.35] text-graphite [text-wrap:pretty]">
                      {post.title}
                    </span>
                    <span className="text-small leading-[1.6] text-gray-800">{post.excerpt}</span>
                    <span className="mt-2 self-start border-b border-silver pb-1 text-small font-medium text-graphite">
                      {c.readMore}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={(nextPage) => updateParams({ page: String(nextPage) }, false)}
              className="border-t border-gray-100 pt-8"
            />
          </>
        ) : (
          <EmptyState
            title={c.empty.title}
            description={c.empty.description}
            action={
              <Button variant="secondary" onClick={() => updateParams({ category: undefined })}>
                {c.empty.action}
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
