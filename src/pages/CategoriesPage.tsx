import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { getProductsByCategory, products as allProducts } from "@/data/products";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Image } from "@/components/ui/Image";
import { ProductCard } from "@/components/product/ProductCard";
import { Seo } from "@/components/seo/Seo";
import { categoriesContent as c } from "@/content/categories";

const categoriesWithCounts = categories
  .map((category) => ({ category, count: getProductsByCategory(category.slug).length }))
  .sort((a, b) => b.count - a.count);

const featuredCategory = categoriesWithCounts[0];
const featuredProducts = getProductsByCategory(featuredCategory.category.slug).slice(0, 4);

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/categories" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.heading }]} />

      <div className="flex flex-col gap-4 pb-10">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        <p className="m-0 max-w-text text-body-large text-gray-800">
          {c.subtitleTemplate(categories.length, allProducts.length)}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 pb-14 md:grid-cols-2 md:pb-20 lg:grid-cols-3">
        {categoriesWithCounts.map(({ category, count }) => (
          <Link
            key={category.slug}
            to={`/products?category=${category.slug}`}
            className="flex flex-col overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
          >
            <Image
              src={category.image}
              alt={category.name}
              width={1600}
              height={1100}
              className="aspect-[16/11] w-full object-cover"
            />
            <span className="flex flex-1 flex-col gap-2 p-6">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-h3 font-semibold text-graphite">{category.name}</span>
                <span dir="ltr" className="font-mono text-caption text-gray-800">
                  {count} محصول
                </span>
              </span>
              <span className="text-small leading-[1.6] text-gray-800">{category.description}</span>
              <span className="mt-2 self-start border-b border-silver pb-1 text-small font-medium text-graphite">
                {c.viewCategory}
              </span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mb-14 grid grid-cols-1 gap-8 rounded-xl bg-graphite p-6 text-fog-white md:mb-20 md:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col gap-4">
          <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-titanium">
            {c.featured.kickerPrefix} &middot; {featuredCategory.category.slug.toUpperCase()}
          </p>
          <h2 className="m-0 text-h2 font-semibold">{c.featured.headingTemplate(featuredCategory.category.name)}</h2>
          <p className="m-0 text-body-large leading-[1.7] text-silver [text-wrap:pretty]">
            {featuredCategory.category.description}
          </p>
          <Link
            to={`/products?category=${featuredCategory.category.slug}`}
            className="self-start border-b border-titanium pb-1 text-body font-medium text-fog-white no-underline transition-colors duration-fast hover:border-cyan"
          >
            {c.featured.linkTemplate(featuredCategory.count, featuredCategory.category.name)}
          </Link>
        </div>
        <div aria-hidden="true" className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-md bg-[repeating-linear-gradient(135deg,#191919_0_6px,#0B0B0C_6px_12px)]"
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-8 border-t border-gray-100 py-14 md:py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="m-0 text-h2 font-semibold">{c.bestsellers.heading}</h2>
          <Link
            to="/products"
            className="text-body font-medium text-graphite no-underline underline-offset-4 hover:underline"
          >
            {c.bestsellers.viewAll}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
