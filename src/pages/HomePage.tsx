import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProducts, getCategories, getBlogPosts, getHomepage } from "@/lib/api";
import { getProductsByCategory } from "@/data/products";
import { formatPrice, formatJalaliDate } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Image } from "@/components/ui/Image";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/home/Reveal";
import { HomeShowcaseBlock } from "@/components/home/HomeShowcaseBlock";
import { Seo } from "@/components/seo/Seo";
import { homeContent } from "@/content/home";
import type { Product } from "@/types/product";

// Matches the prefetch in src/entry-server.tsx — without a staleTime, React
// Query treats hydrated data as immediately stale and refetches on mount
// anyway, which defeats the point of dehydrating it into the prerendered
// HTML in the first place (§7.1: "...تا هیدریشن دوباره فچ/فلش نکند").
const PRERENDERED_STALE_TIME = 60_000;

export default function HomePage() {
  const { data: productsPage } = useQuery({
    queryKey: ["products", "home"],
    queryFn: () => getProducts({ pageSize: 24 }),
    staleTime: PRERENDERED_STALE_TIME,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: PRERENDERED_STALE_TIME,
  });
  const { data: blogPage } = useQuery({
    queryKey: ["blogPosts", "home"],
    queryFn: () => getBlogPosts({ pageSize: 3 }),
    staleTime: PRERENDERED_STALE_TIME,
  });
  // Owner-editable hero / showcase / community sections (HOMEPAGE-ADMIN-TASK.md
  // §5). `homepage` is null on any endpoint failure — see getHomepage()'s doc
  // comment — which is the signal to render this page exactly as it looked
  // before this feature existed, never a broken or empty one.
  const { data: homepage } = useQuery({
    queryKey: ["homepage"],
    queryFn: getHomepage,
    staleTime: PRERENDERED_STALE_TIME,
  });

  const products = productsPage?.results ?? [];
  const showcaseA = products.find((p) => p.slug === "product-a");
  const showcaseB = products.find((p) => p.slug === "product-b");
  const featuredSlugs = ["product-c", "product-d", "product-e", "product-f"];
  const featured = featuredSlugs.map((slug) => products.find((p) => p.slug === slug));

  const hero = homepage?.hero;
  const heroImage = hero?.image || "/images/marketing/hero.jpg";
  const heroImageMobile = hero?.imageMobile || "";
  const heroImageAlt = hero?.imageAlt || homeContent.hero.imageAlt;
  const heroTitle = hero?.title || homeContent.hero.title;
  const heroSubtitle = hero?.subtitle || homeContent.hero.subtitle;
  const heroCaption = hero?.caption || homeContent.hero.caption;
  const heroCtaLabel = hero?.ctaLabel || homeContent.hero.cta;
  const heroCtaUrl = hero?.ctaUrl || "/products";

  const dynamicShowcase1 = homepage?.showcases.find((s) => s.order === 1);
  const dynamicShowcase2 = homepage?.showcases.find((s) => s.order === 2);

  function productSpecs(product: Product) {
    return [
      { label: "ابعاد", value: `${product.dimensions.w} × ${product.dimensions.h} × ${product.dimensions.d} mm` },
      { label: "وزن", value: `${product.weight} g` },
      { label: "متریال", value: product.material },
      { label: "قیمت", value: formatPrice(product.price) },
    ];
  }

  // Only active when zero tiles came back from a *successfully reached*
  // endpoint — on error `homepage` is null and the section keeps its
  // pre-existing static images instead (see the section below).
  const communityTiles = homepage?.communityTiles ?? [];
  const showCommunitySection = homepage === null || homepage === undefined || communityTiles.length > 0;

  return (
    <div>
      <Seo raw title={`VYBE — ${homeContent.seo.title}`} description={homeContent.seo.description} path="/" />
      {/* هیرو */}
      <section className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-10 bg-graphite px-5 py-14 text-center text-fog-white md:py-20 xl:px-10">
        <div className="relative flex aspect-square w-full max-w-[520px] items-end overflow-hidden rounded-xl border border-edge">
          {heroImageMobile && (
            <Image
              src={heroImageMobile}
              alt={heroImageAlt}
              width={1200}
              height={1600}
              priority
              dark
              className="absolute inset-0 block size-full object-cover md:hidden"
            />
          )}
          <Image
            src={heroImage}
            alt={heroImageAlt}
            width={1200}
            height={1200}
            priority
            dark
            className={cn("size-full object-cover", heroImageMobile ? "hidden md:block" : "block")}
          />
        </div>
        <div className="flex max-w-text flex-col items-center gap-6">
          <h1 className="m-0 text-display font-extrabold">{heroTitle}</h1>
          <p className="m-0 text-body-large text-silver">{heroSubtitle}</p>
          <Link to={heroCtaUrl}>
            <Button className="h-14 bg-white px-8 text-graphite hover:bg-gray-100">{heroCtaLabel}</Button>
          </Link>
        </div>
        <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
          {heroCaption}
        </span>
        <div id="hero-sentinel" className="absolute bottom-0 h-px w-full" aria-hidden="true" />
      </section>

      {/* نوار جوهره */}
      <section className="border-b border-gray-100 bg-white px-5 py-14 text-center md:py-16 xl:px-10">
        <Reveal>
          <h2 className="m-0 text-h2 font-semibold">{homeContent.essence.heading}</h2>
        </Reveal>
      </section>

      {/* نمایش محصول ۱ */}
      {dynamicShowcase1 ? (
        <HomeShowcaseBlock
          image={dynamicShowcase1.image}
          imageAlt={dynamicShowcase1.imageAlt}
          title={dynamicShowcase1.title}
          description={dynamicShowcase1.description}
          specs={dynamicShowcase1.specs}
          ctaLabel={dynamicShowcase1.ctaLabel}
          ctaUrl={dynamicShowcase1.ctaUrl}
          theme={dynamicShowcase1.theme}
          imageFirst
        />
      ) : (
        showcaseA && (
          <HomeShowcaseBlock
            image={showcaseA.images[0]}
            imageAlt={showcaseA.name}
            kicker={`SKU ${showcaseA.sku}`}
            title={showcaseA.name}
            description={showcaseA.shortDescription}
            specs={productSpecs(showcaseA)}
            ctaLabel="جزئیات را ببینید"
            ctaUrl={`/products/${showcaseA.slug}`}
            theme="light"
            imageFirst
          />
        )
      )}

      {/* نمایش محصول ۲ */}
      {dynamicShowcase2 ? (
        <HomeShowcaseBlock
          image={dynamicShowcase2.image}
          imageAlt={dynamicShowcase2.imageAlt}
          title={dynamicShowcase2.title}
          description={dynamicShowcase2.description}
          specs={dynamicShowcase2.specs}
          ctaLabel={dynamicShowcase2.ctaLabel}
          ctaUrl={dynamicShowcase2.ctaUrl}
          theme={dynamicShowcase2.theme}
          imageFirst={false}
        />
      ) : (
        showcaseB && (
          <HomeShowcaseBlock
            image={showcaseB.images[0]}
            imageAlt={showcaseB.name}
            kicker={`SKU ${showcaseB.sku}`}
            title={showcaseB.name}
            description={showcaseB.shortDescription}
            specs={productSpecs(showcaseB)}
            ctaLabel="جزئیات را ببینید"
            ctaUrl={`/products/${showcaseB.slug}`}
            theme="dark"
            imageFirst={false}
          />
        )
      )}

      {/* دسته‌بندی‌ها */}
      <section className="mx-auto max-w-page px-5 py-14 md:py-20 xl:px-10">
        <Reveal className="mb-8 flex flex-wrap items-baseline justify-between gap-6">
          <h2 className="m-0 text-h2 font-semibold">{homeContent.categories.heading}</h2>
          <Link
            to="/categories"
            className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
          >
            {homeContent.categories.viewAll}
          </Link>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(categoriesData ?? Array.from({ length: 6 })).map((category, index) =>
            category ? (
              <Reveal key={category.slug} delayMs={(index % 3) * 70}>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="block overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
                >
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={1600}
                    height={1100}
                    className="aspect-[16/11] w-full object-cover"
                  />
                  <span className="flex items-baseline justify-between gap-2 p-4">
                    <span className="text-h4 font-h4 text-graphite">{category.name}</span>
                    <span dir="ltr" className="font-mono text-caption text-gray-800">
                      {getProductsByCategory(category.slug).length} محصول
                    </span>
                  </span>
                </Link>
              </Reveal>
            ) : (
              <Skeleton key={index} className="aspect-[16/11] rounded-lg" />
            ),
          )}
        </div>
      </section>

      {/* چگونه ساخته می‌شود */}
      <section className="bg-graphite py-14 text-fog-white md:py-20">
        <div className="mx-auto flex max-w-page flex-col gap-12 px-5 xl:px-10">
          <Reveal className="flex max-w-text flex-col gap-4">
            <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-cyan">
              {homeContent.process.kicker}
            </span>
            <h2 className="m-0 text-h2 font-semibold">{homeContent.process.heading}</h2>
            <p className="m-0 text-body-large text-silver">{homeContent.process.subtitle}</p>
          </Reveal>
          {/* «ماکرو خطوط لایه‌ای» با وجود نامش یک تصویرسازی کارتونی سبز با
          لوگوی «vybe» روی آن است — گرافیک آماده دیگری از همان دسته
          (FIX-TASK.md دور دوم) — تا نسخه واقعی برسد جای‌نگهدار می‌ماند. */}
          <Reveal>
            <ImagePlaceholder
              caption={homeContent.process.macroImageAlt}
              dark
              className="h-[280px] w-full rounded-lg border border-edge"
            />
          </Reveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {homeContent.process.steps.map((item) => (
              <Reveal key={item.step} className="flex flex-col gap-3 border-t border-edge pt-6">
                <span dir="ltr" className="font-mono text-micro text-titanium">
                  {item.step}
                </span>
                <span className="text-h4 font-h4">{item.title}</span>
                <p className="m-0 text-body leading-[1.6] text-silver">{item.body}</p>
              </Reveal>
            ))}
          </div>
          <div dir="ltr" className="flex flex-wrap gap-6 border-t border-edge pt-6 font-mono text-caption tracking-[0.06em] text-titanium">
            {homeContent.process.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* اکنون موجود است */}
      <section className="mx-auto max-w-page px-5 py-14 md:py-20 xl:px-10">
        <Reveal className="mb-8 flex flex-wrap items-baseline justify-between gap-6">
          <h2 className="m-0 text-h2 font-semibold">{homeContent.featured.heading}</h2>
          <Link
            to="/products"
            className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
          >
            {homeContent.featured.viewAll}
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {featured.map((product, index) =>
            product ? (
              <Reveal key={product.slug} delayMs={(index % 4) * 70}>
                <ProductCard product={product} />
              </Reveal>
            ) : (
              <Skeleton key={index} className="aspect-[4/5] rounded-lg" />
            ),
          )}
        </div>
      </section>

      {/* از بلاگ */}
      <section className="border-y border-gray-100 bg-white px-5 py-14 md:py-20 xl:px-10">
        <div className="mx-auto max-w-page">
          <Reveal className="mb-8 flex flex-wrap items-baseline justify-between gap-6">
            <h2 className="m-0 text-h2 font-semibold">{homeContent.blog.heading}</h2>
            <Link
              to="/blog"
              className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
            >
              {homeContent.blog.viewAll}
            </Link>
          </Reveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(blogPage?.results ?? Array.from({ length: 3 })).map((post, index) =>
              post ? (
                <Reveal key={post.slug}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
                  >
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      width={1600}
                      height={1000}
                      className="aspect-[16/10] w-full object-cover"
                    />
                    <span className="flex flex-col gap-2 p-4">
                      <span dir="ltr" className="font-mono text-micro tracking-[0.06em] text-gray-800">
                        {post.tags[0]} &middot; {formatJalaliDate(post.publishedAt)} &middot; {post.readingTime} دقیقه
                      </span>
                      <span className="text-h4 font-h4 text-graphite [text-wrap:pretty]">{post.title}</span>
                      <span className="text-small leading-[1.6] text-gray-800">{post.excerpt}</span>
                    </span>
                  </Link>
                </Reveal>
              ) : (
                <Skeleton key={index} className="aspect-[16/10] rounded-lg" />
              ),
            )}
          </div>
        </div>
      </section>

      {/* جامعه — communityTiles.length === 0 از یک اندپوینت سالم یعنی مالک
      عمداً هیچ کاشی‌ای فعال نکرده؛ کل سکشن رندر نمی‌شود (HOMEPAGE-ADMIN-TASK.md
      §1). خطای اندپوینت نتیجه‌ی متفاوتی دارد — تصاویر استاتیک قبلی می‌مانند. */}
      {showCommunitySection && (
        <section className="mx-auto grid max-w-page grid-cols-1 items-center gap-12 px-5 py-14 md:py-20 lg:grid-cols-2 xl:px-10">
          <Reveal className="flex max-w-[520px] flex-col gap-4">
            <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
              {homeContent.community.kicker}
            </span>
            <h2 className="m-0 text-h2 font-semibold">{homeContent.community.heading}</h2>
            <p className="m-0 text-body-large text-gray-800">{homeContent.community.body}</p>
            <form className="mt-2 flex max-w-[420px] gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder={homeContent.community.emailPlaceholder}
                className="h-12 flex-1 rounded-md border border-silver bg-white px-4 text-body outline-none transition-colors duration-fast hover:border-titanium focus-visible:border-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              />
              <button
                type="submit"
                className="h-12 rounded-md border-0 bg-graphite px-6 text-body font-medium text-fog-white transition-colors duration-fast hover:bg-ink"
              >
                {homeContent.community.submitLabel}
              </button>
            </form>
          </Reveal>
          <div className="grid grid-cols-3 gap-2">
            {communityTiles.length > 0
              ? communityTiles.map((tile, index) => (
                  <Reveal key={tile.id} delayMs={(index % 3) * 70}>
                    {tile.linkUrl ? (
                      <Link to={tile.linkUrl}>
                        <Image
                          src={tile.image}
                          alt={tile.imageAlt}
                          width={400}
                          height={400}
                          className="aspect-square w-full rounded-md object-cover"
                        />
                      </Link>
                    ) : (
                      <Image
                        src={tile.image}
                        alt={tile.imageAlt}
                        width={400}
                        height={400}
                        className="aspect-square w-full rounded-md object-cover"
                      />
                    )}
                  </Reveal>
                ))
              : homeContent.community.images.map((image, index) => (
                  <Reveal key={image.src} delayMs={(index % 3) * 70}>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={400}
                      height={400}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  </Reveal>
                ))}
          </div>
        </section>
      )}
    </div>
  );
}
