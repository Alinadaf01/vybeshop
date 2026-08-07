import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProducts, getCategories, getBlogPosts } from "@/lib/api";
import { getProductsByCategory } from "@/data/products";
import { formatPrice, formatJalaliDate } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { Image } from "@/components/ui/Image";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/home/Reveal";
import { homeContent } from "@/content/home";

export default function HomePage() {
  const { data: productsPage } = useQuery({
    queryKey: ["products", "home"],
    queryFn: () => getProducts({ pageSize: 24 }),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });
  const { data: blogPage } = useQuery({
    queryKey: ["blogPosts", "home"],
    queryFn: () => getBlogPosts({ pageSize: 3 }),
  });

  const products = productsPage?.results ?? [];
  const showcaseA = products.find((p) => p.slug === "vybe-stand-air");
  const showcaseB = products.find((p) => p.slug === "vybe-snap-mag");
  const featuredSlugs = ["vybe-stand-pro", "vybe-dock-pro", "vybe-hook-duo", "vybe-fold-travel"];
  const featured = featuredSlugs.map((slug) => products.find((p) => p.slug === slug));

  return (
    <div>
      {/* هیرو */}
      <section className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-10 bg-graphite px-5 py-14 text-center text-fog-white md:py-20 xl:px-10">
        <div className="flex aspect-square w-full max-w-[520px] items-end rounded-xl border border-edge">
          <Image
            src="/images/marketing/hero.jpg"
            alt={homeContent.hero.imageAlt}
            width={1200}
            height={1200}
            priority
            dark
            className="size-full rounded-xl object-cover"
          />
        </div>
        <div className="flex max-w-text flex-col items-center gap-6">
          <h1 className="m-0 text-display font-extrabold">{homeContent.hero.title}</h1>
          <p className="m-0 text-body-large text-silver">{homeContent.hero.subtitle}</p>
          <Link to="/products">
            <Button className="h-14 bg-white px-8 text-graphite hover:bg-gray-100">{homeContent.hero.cta}</Button>
          </Link>
        </div>
        <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
          {homeContent.hero.caption}
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
      {showcaseA && (
        <section className="grid grid-cols-1 bg-fog-white lg:grid-cols-2">
          <Image
            src={showcaseA.images[0]}
            alt={showcaseA.name}
            width={1200}
            height={1200}
            className="aspect-square w-full object-cover"
          />
          <Reveal className="flex flex-col justify-center gap-6 px-5 py-14 md:py-20 xl:px-10">
            <div className="flex max-w-[520px] flex-col gap-4">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                SKU {showcaseA.sku}
              </span>
              <h2 className="m-0 text-h2 font-semibold">{showcaseA.name}</h2>
              <p className="m-0 text-body-large text-gray-800">{showcaseA.shortDescription}</p>
            </div>
            <dl className="m-0 max-w-[420px] border-t border-gray-100">
              <div className="flex justify-between gap-4 border-b border-gray-100 py-3">
                <dt className="text-small text-gray-800">ابعاد</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {showcaseA.dimensions.w} × {showcaseA.dimensions.h} × {showcaseA.dimensions.d} mm
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-100 py-3">
                <dt className="text-small text-gray-800">وزن</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {showcaseA.weight} g
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-100 py-3">
                <dt className="text-small text-gray-800">متریال</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {showcaseA.material}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-small text-gray-800">قیمت</dt>
                <dd dir="ltr" className="m-0 font-mono text-small text-gray-800">
                  {formatPrice(showcaseA.price)}
                </dd>
              </div>
            </dl>
            <Link to={`/products/${showcaseA.slug}`} className="self-start">
              <Button variant="text">جزئیات را ببینید</Button>
            </Link>
          </Reveal>
        </section>
      )}

      {/* نمایش محصول ۲ */}
      {showcaseB && (
        <section className="grid grid-cols-1 bg-graphite text-fog-white lg:grid-cols-2">
          <Reveal className="flex flex-col justify-center gap-6 px-5 py-14 md:py-20 xl:px-10">
            <div className="flex max-w-[520px] flex-col gap-4">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
                SKU {showcaseB.sku}
              </span>
              <h2 className="m-0 text-h2 font-semibold">{showcaseB.name}</h2>
              <p className="m-0 text-body-large text-silver">{showcaseB.shortDescription}</p>
            </div>
            <dl className="m-0 max-w-[420px] border-t border-edge">
              <div className="flex justify-between gap-4 border-b border-edge py-3">
                <dt className="text-small text-titanium">ابعاد</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {showcaseB.dimensions.w} × {showcaseB.dimensions.h} × {showcaseB.dimensions.d} mm
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-edge py-3">
                <dt className="text-small text-titanium">وزن</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {showcaseB.weight} g
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-edge py-3">
                <dt className="text-small text-titanium">متریال</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {showcaseB.material}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-small text-titanium">قیمت</dt>
                <dd dir="ltr" className="m-0 font-mono text-small text-silver">
                  {formatPrice(showcaseB.price)}
                </dd>
              </div>
            </dl>
            <Link to={`/products/${showcaseB.slug}`} className="self-start">
              <Button variant="text" className="border-titanium text-fog-white hover:border-cyan">
                جزئیات را ببینید
              </Button>
            </Link>
          </Reveal>
          <Image
            src={showcaseB.images[0]}
            alt={showcaseB.name}
            width={1200}
            height={1200}
            dark
            className="order-first aspect-square w-full object-cover lg:order-none"
          />
        </section>
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
              <Reveal key={category.slug}>
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
          <Reveal>
            <ImagePlaceholder
              caption={homeContent.process.macroImageAlt}
              dark
              className="h-[280px] items-end rounded-lg border border-edge"
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
              <Reveal key={product.slug}>
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

      {/* جامعه */}
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
        <Reveal className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-md bg-[repeating-linear-gradient(135deg,#ECECEC_0_6px,#F5F5F3_6px_12px)]"
            />
          ))}
        </Reveal>
      </section>
    </div>
  );
}
