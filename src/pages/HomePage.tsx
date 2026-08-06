import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProducts, getCategories, getBlogPosts } from "@/lib/api";
import { getProductsByCategory } from "@/data/products";
import { formatPrice, formatJalaliDate } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/home/Reveal";
import { cn } from "@/lib/cn";

function ImagePlaceholder({
  caption,
  dark,
  className,
}: {
  caption: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end p-4",
        dark
          ? "bg-[repeating-linear-gradient(135deg,#141416_0_10px,#0B0B0C_10px_20px)]"
          : "bg-[repeating-linear-gradient(135deg,#ECECEC_0_10px,#F5F5F3_10px_20px)]",
        className,
      )}
    >
      <span dir="ltr" className={cn("font-mono text-micro leading-[1.6]", dark ? "text-silver" : "text-gray-800")}>
        {caption}
      </span>
    </div>
  );
}

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
          <ImagePlaceholder
            caption="محصول قهرمان، مشکی مات، مرکز کادر — نور نرم از بالا · 1:1"
            dark
            className="size-full rounded-xl"
          />
        </div>
        <div className="flex max-w-text flex-col items-center gap-6">
          <h1 className="m-0 text-display font-extrabold">هر قطعه، یک تصمیم طراحی</h1>
          <p className="m-0 text-body-large text-silver">اشیای کاربردی روزمره، پرینت‌شده لایه به لایه در کارگاه ما.</p>
          <Link to="/products">
            <Button className="h-14 bg-white px-8 text-graphite hover:bg-gray-100">مجموعه را کاوش کنید</Button>
          </Link>
        </div>
        <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
          PLA &middot; FDM &middot; 0.2MM LAYER
        </span>
        <div id="hero-sentinel" className="absolute bottom-0 h-px w-full" aria-hidden="true" />
      </section>

      {/* نوار جوهره */}
      <section className="border-b border-gray-100 bg-white px-5 py-14 text-center md:py-16 xl:px-10">
        <Reveal>
          <h2 className="m-0 text-h2 font-semibold">طراحی مینیمال. حداکثر کاربرد.</h2>
        </Reveal>
      </section>

      {/* نمایش محصول ۱ */}
      {showcaseA && (
        <section className="grid grid-cols-1 bg-fog-white lg:grid-cols-2">
          <ImagePlaceholder caption="محصول روی بتن، نور کناری · 1:1" className="aspect-square" />
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
              <Button
                variant="text"
                className="border-titanium text-fog-white hover:border-cyan"
              >
                جزئیات را ببینید
              </Button>
            </Link>
          </Reveal>
          <ImagePlaceholder caption="محصول مشکی مات روی مشکی، نور کناری · 1:1" dark className="order-first aspect-square lg:order-none" />
        </section>
      )}

      {/* دسته‌بندی‌ها */}
      <section className="mx-auto max-w-page px-5 py-14 md:py-20 xl:px-10">
        <Reveal className="mb-8 flex flex-wrap items-baseline justify-between gap-6">
          <h2 className="m-0 text-h2 font-semibold">دسته‌بندی‌ها</h2>
          <Link
            to="/categories"
            className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
          >
            همه دسته‌ها
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
                  <ImagePlaceholder caption={`${category.name} · 16:11`} className="aspect-[16/11]" />
                  <span className="flex items-baseline justify-between gap-2 p-4">
                    <span className="text-h4 font-semibold text-graphite">{category.name}</span>
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
              PROCESS
            </span>
            <h2 className="m-0 text-h2 font-semibold">چگونه ساخته می‌شود</h2>
            <p className="m-0 text-body-large text-silver">خط لایه را پنهان نمی‌کنیم. ردّ ساخت روی هر سطح می‌ماند.</p>
          </Reveal>
          <Reveal>
            <ImagePlaceholder
              caption="ماکرو خطوط لایه‌ای، تمام‌عرض — نور کناری تند، عمق میدان کم · 16:4"
              dark
              className="h-[280px] items-end rounded-lg border border-edge"
            />
          </Reveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: "01 / DESIGN", title: "طراحی", body: "از طرح دستی تا مدل پارامتریک. میانگین شش نمونه تا نسخه نهایی." },
              { step: "02 / PRINT", title: "پرینت", body: "فیلامنت PLA، ارتفاع لایه ۰.۲ میلی‌متر، بدون پرداخت شیمیایی." },
              { step: "03 / DELIVER", title: "تحویل", body: "بازرسی دستی هر قطعه، بسته‌بندی مقوایی بدون پلاستیک." },
            ].map((item) => (
              <Reveal key={item.step} className="flex flex-col gap-3 border-t border-edge pt-6">
                <span dir="ltr" className="font-mono text-micro text-titanium">
                  {item.step}
                </span>
                <span className="text-h4 font-medium">{item.title}</span>
                <p className="m-0 text-body leading-[1.6] text-silver">{item.body}</p>
              </Reveal>
            ))}
          </div>
          <div dir="ltr" className="flex flex-wrap gap-6 border-t border-edge pt-6 font-mono text-caption tracking-[0.06em] text-titanium">
            <span>PLA</span>
            <span>FDM</span>
            <span>0.2MM LAYER</span>
            <span>BAMBU LAB P1S</span>
          </div>
        </div>
      </section>

      {/* اکنون موجود است */}
      <section className="mx-auto max-w-page px-5 py-14 md:py-20 xl:px-10">
        <Reveal className="mb-8 flex flex-wrap items-baseline justify-between gap-6">
          <h2 className="m-0 text-h2 font-semibold">اکنون موجود است</h2>
          <Link
            to="/products"
            className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
          >
            همه محصولات
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {featured.map((product, index) =>
            product ? (
              <Reveal key={product.slug}>
                <Link
                  to={`/products/${product.slug}`}
                  className="block overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
                >
                  <ImagePlaceholder caption={product.sku} className="aspect-[4/5] p-3" />
                  <span className="flex flex-col gap-2 p-4">
                    <span className="text-[18px] font-bold leading-[1.35] text-graphite [text-wrap:pretty]">
                      {product.name}
                    </span>
                    <span className="text-small text-gray-800">{product.shortDescription}</span>
                    <span dir="ltr" className="self-start font-mono text-small text-gray-800">
                      {formatPrice(product.price)}
                    </span>
                  </span>
                </Link>
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
            <h2 className="m-0 text-h2 font-semibold">از بلاگ</h2>
            <Link
              to="/blog"
              className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
            >
              همه نوشته‌ها
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
                    <ImagePlaceholder caption="تصویر شاخص مقاله · 16:10" className="aspect-[16/10]" />
                    <span className="flex flex-col gap-2 p-4">
                      <span dir="ltr" className="font-mono text-micro tracking-[0.06em] text-gray-800">
                        {post.tags[0]} &middot; {formatJalaliDate(post.publishedAt)} &middot; {post.readingTime} دقیقه
                      </span>
                      <span className="text-h4 font-semibold text-graphite [text-wrap:pretty]">{post.title}</span>
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
            COMMUNITY
          </span>
          <h2 className="m-0 text-h2 font-semibold">جامعه VYBE</h2>
          <p className="m-0 text-body-large text-gray-800">
            ماهی یک ایمیل: محصول تازه و یادداشت‌های کارگاه. عکس‌های شما را با برچسب VYBE می‌بینیم.
          </p>
          <form className="mt-2 flex max-w-[420px] gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              required
              placeholder="ایمیل شما"
              className="h-12 flex-1 rounded-md border border-silver bg-white px-4 text-body outline-none transition-colors duration-fast hover:border-titanium focus-visible:border-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            />
            <button
              type="submit"
              className="h-12 rounded-md border-0 bg-graphite px-6 text-body font-medium text-fog-white transition-colors duration-fast hover:bg-ink"
            >
              عضویت
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
