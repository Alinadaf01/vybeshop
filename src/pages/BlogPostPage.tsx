import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBlogPost } from "@/lib/api";
import { blogPosts } from "@/data/blog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { PageLoadingFallback } from "@/pages/PageLoadingFallback";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { formatJalaliDate } from "@/lib/formatters";
import { Seo } from "@/components/seo/Seo";
import { absoluteUrl, buildArticleJsonLd } from "@/lib/seo";
import { blogPostContent as c } from "@/content/blogPost";

function authorInitials(author: string) {
  return author
    .split(" ")
    .filter((word) => word && word !== "VYBE")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => getBlogPost(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isError) return <NotFoundPage />;
  if (isLoading || !post) return <PageLoadingFallback />;

  const related = blogPosts
    .filter((item) => item.slug !== post.slug && item.category === post.category)
    .slice(0, 3);
  const relatedFallback =
    related.length > 0
      ? related
      : blogPosts
          .filter((item) => item.slug !== post.slug)
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 3);

  const postUrl = absoluteUrl(`/blog/${post.slug}`);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(postUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`;

  return (
    <div>
      <Seo
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        image={post.coverImage}
        type="article"
        jsonLd={buildArticleJsonLd(post, absoluteUrl(post.coverImage))}
      />
      <div className="mx-auto max-w-page px-5 xl:px-10">
        <Breadcrumb
          items={[
            { label: "خانه", href: "/" },
            { label: c.breadcrumbBlog, href: "/blog" },
            { label: post.title },
          ]}
        />

        <article className="grid grid-cols-1 gap-10 pb-14 md:pb-20 lg:grid-cols-[240px_minmax(0,720px)] lg:justify-center lg:gap-16">
          <aside className="hidden flex-col gap-4 lg:sticky lg:top-[104px] lg:flex lg:self-start">
            <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
              {c.toc.label}
            </span>
            <nav className="flex flex-col gap-2">
              {post.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="border-s-2 border-gray-100 ps-4 text-small text-gray-800 no-underline transition-colors duration-fast hover:border-graphite hover:text-graphite"
                >
                  {section.heading}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
              <span dir="ltr" className="font-mono text-micro text-gray-800">
                {c.toc.share}
              </span>
              <div dir="ltr" className="flex flex-wrap gap-2 font-mono text-micro text-gray-800">
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-silver px-2 py-1 no-underline transition-colors duration-fast hover:border-titanium"
                >
                  {c.toc.telegram}
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-sm border border-silver bg-white px-2 py-1 transition-colors duration-fast hover:border-titanium"
                >
                  {linkCopied ? c.toc.copiedLink : c.toc.copyLink}
                </button>
              </div>
            </div>
          </aside>

          <div className="flex max-w-text flex-col gap-8">
            <header className="flex flex-col gap-4">
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{post.category}</Badge>
                <span dir="ltr" className="font-mono text-micro text-gray-800">
                  {formatJalaliDate(post.publishedAt)} &middot; {c.readingTimeTemplate(post.readingTime)}
                </span>
              </span>
              <h1 className="m-0 text-display font-extrabold [text-wrap:pretty]">{post.title}</h1>
              <p className="m-0 text-body-large leading-[1.7] text-gray-800 [text-wrap:pretty]">{post.excerpt}</p>
              <div className="flex items-center gap-4 border-y border-gray-100 py-4">
                <span
                  dir="ltr"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-gray-100 font-mono text-micro text-gray-800"
                >
                  {authorInitials(post.author)}
                </span>
                <span className="flex flex-col">
                  <span className="text-small font-semibold">{post.author}</span>
                  <span className="text-caption text-gray-800">{post.authorRole}</span>
                </span>
              </div>
            </header>

            <Image
              src={post.coverImage}
              alt={post.title}
              width={1440}
              height={810}
              priority
              className="aspect-video w-full rounded-lg border border-gray-100 object-cover"
            />

            {post.sections.map((section) => (
              <section key={section.id} id={section.id} className="flex flex-col gap-3">
                <h2 className="m-0 mt-3 text-h2 font-semibold">{section.heading}</h2>
                <p className="m-0 text-body leading-[1.8] text-gray-800 [text-wrap:pretty]">{section.body}</p>
              </section>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
              {feedback ? (
                <span className="text-small text-gray-800">{c.usefulPrompt.thanks}</span>
              ) : (
                <>
                  <span className="text-small text-gray-800">{c.usefulPrompt.question}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedback("yes")}
                      className="h-11 rounded-md border border-silver bg-white px-4 text-small font-medium transition-colors duration-fast hover:border-titanium"
                    >
                      {c.usefulPrompt.yes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedback("no")}
                      className="h-11 rounded-md border border-silver bg-white px-4 text-small font-medium transition-colors duration-fast hover:border-titanium"
                    >
                      {c.usefulPrompt.no}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </article>

        <section className="flex flex-col gap-8 border-t border-gray-100 py-14 md:py-20">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-h2 font-semibold">{c.related.heading}</h2>
            <Link
              to="/blog"
              className="text-body font-medium text-graphite no-underline underline-offset-4 hover:underline"
            >
              {c.related.viewAll}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {relatedFallback.map((item) => (
              <Link
                key={item.slug}
                to={`/blog/${item.slug}`}
                className="flex flex-col overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
              >
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  width={800}
                  height={500}
                  className="aspect-[16/10] w-full border-b border-gray-100 object-cover"
                />
                <span className="flex flex-1 flex-col gap-2 p-4">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{item.category}</Badge>
                    <span dir="ltr" className="font-mono text-micro text-gray-800">
                      {formatJalaliDate(item.publishedAt)} &middot; {c.readingTimeTemplate(item.readingTime)}
                    </span>
                  </span>
                  <span className="text-h4 font-h4 leading-[1.35] text-graphite [text-wrap:pretty]">
                    {item.title}
                  </span>
                  <span className="text-small leading-[1.6] text-gray-800">{item.excerpt}</span>
                  <span className="mt-2 self-start border-b border-silver pb-1 text-small font-medium text-graphite">
                    {c.related.readMore}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
