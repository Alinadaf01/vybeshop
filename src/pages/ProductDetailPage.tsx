import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct, addCartItem } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { categories } from "@/data/categories";
import { getProductsByCategory } from "@/data/products";
import { formatPrice, formatDimensions } from "@/lib/formatters";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Rating } from "@/components/ui/Rating";
import { SpecTable } from "@/components/product/SpecTable";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductCard } from "@/components/product/ProductCard";
import { Image } from "@/components/ui/Image";
import { PageLoadingFallback } from "@/pages/PageLoadingFallback";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { Seo } from "@/components/seo/Seo";
import { buildProductJsonLd, absoluteUrl } from "@/lib/seo";
import { productDetailContent as c } from "@/content/productDetail";

const LOW_STOCK_THRESHOLD = 10;

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug!),
    enabled: !!slug,
    retry: false,
  });

  const addToCartMutation = useMutation({
    mutationFn: addCartItem,
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
      showToast({ variant: "success", message: c.addedToCartToast, action: { label: c.viewCart, onClick: () => navigate("/cart") } });
    },
    onError: () => {
      showToast({ variant: "danger", message: c.addToCartErrorToast });
    },
  });

  if (isError) return <NotFoundPage />;
  if (isLoading || !product) return <PageLoadingFallback />;

  const category = categories.find((c2) => c2.slug === product.category);
  const isOutOfStock = product.stockCount <= 0;
  const isLowStock = !isOutOfStock && product.stockCount <= LOW_STOCK_THRESHOLD;
  const selectedColor = product.colors[selectedColorIndex];

  function handleColorSelect(index: number) {
    setSelectedColorIndex(index);
    setActiveImageIndex(index % product!.images.length);
  }

  function handleAddToCart() {
    addToCartMutation.mutate({
      productId: product!.id,
      colorOptionId: selectedColor?.id,
      quantity,
    });
  }

  const related = getProductsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div>
      <Seo
        title={product.name}
        description={product.shortDescription}
        path={`/products/${product.slug}`}
        image={product.images[0]}
        type="product"
        jsonLd={buildProductJsonLd(product, category?.name, absoluteUrl(product.images[0]))}
      />
      <div className="mx-auto max-w-page px-5 xl:px-10">
        <Breadcrumb
          items={[
            { label: "خانه", href: "/" },
            { label: "محصولات", href: "/products" },
            ...(category ? [{ label: category.name, href: `/products?category=${category.slug}` }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className="mx-auto max-w-page px-5 xl:px-10">
        <section className="grid grid-cols-1 gap-10 pb-14 pt-6 md:pb-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
          <ProductGallery
            images={product.images}
            productName={product.name}
            activeIndex={activeImageIndex}
            onActiveIndexChange={setActiveImageIndex}
          />

          <div className="flex flex-col gap-6 lg:sticky lg:top-[104px] lg:self-start">
            <div className="flex flex-col gap-3">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                {category?.name} &middot; {product.sku}
              </span>
              <h1 className="m-0 text-h1 font-bold [text-wrap:pretty]">{product.name}</h1>
              <p className="m-0 text-body-large text-gray-800">{product.shortDescription}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Rating value={c.ratingValue} count={c.ratingCount} />
              <a
                href="#reviews"
                className="text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
              >
                {c.reviewsCountLabel}
              </a>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-100 pt-6">
              <span dir="ltr" className="font-mono text-h3 font-medium text-graphite">
                {formatPrice(product.price)}
              </span>
              <span className="text-small text-gray-800">{c.priceNote}</span>
            </div>

            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-1 p-0 text-small font-semibold">
                {c.colorLegend}
                {selectedColor ? ` — ${selectedColor.name}` : ""}
              </legend>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color, index) => (
                  <ColorSwatch
                    key={color.name}
                    hex={color.hex}
                    name={color.name}
                    selected={index === selectedColorIndex}
                    outOfStock={!color.inStock}
                    onClick={() => handleColorSelect(index)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} disabled={isOutOfStock} aria-label="تعداد" />
              <Button
                variant="primary"
                disabled={isOutOfStock || addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="min-w-[180px] flex-1"
              >
                {isOutOfStock ? c.outOfStock : addToCartMutation.isPending ? c.addingToCart : c.addToCart}
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="flex-1">
                {c.saveToFavorites}
              </Button>
              <Button variant="secondary" className="font-mono text-micro">
                {c.share}
              </Button>
            </div>

            {isLowStock && (
              <p className="m-0 flex items-center gap-2 rounded-md border border-gray-100 bg-white p-4 text-small text-warning-ink">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />
                {c.lowStockTemplate(product.stockCount, product.colors[0]?.name ?? "")}
              </p>
            )}

            <dl className="m-0 flex flex-col border-t border-gray-100">
              <div className="flex justify-between gap-4 border-b border-gray-100 py-3">
                <dt className="text-small text-gray-800">{c.shipping.label}</dt>
                <dd className="m-0 text-small">{c.shipping.value}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-100 py-3">
                <dt className="text-small text-gray-800">{c.returns.label}</dt>
                <dd className="m-0 text-small">{c.returns.value}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-small text-gray-800">{c.buildStatus.label}</dt>
                <dd dir="ltr" className={`m-0 font-mono text-small ${isOutOfStock ? "text-danger-ink" : "text-success-ink"}`}>
                  {isOutOfStock ? c.buildStatus.outOfStock : c.buildStatus.inStock}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 border-t border-gray-100 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
          <div className="flex max-w-text flex-col gap-6">
            <h2 className="m-0 text-h2 font-semibold">{c.whyThisShape.heading}</h2>
            <p className="m-0 text-body-large leading-[1.7] text-gray-800 [text-wrap:pretty]">{product.description}</p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {c.whyThisShape.highlights.map((item, index) => (
                <li key={item} className="flex gap-3 border-t border-gray-100 pt-3 text-body text-gray-800">
                  <span aria-hidden="true" className="font-mono text-micro text-gray-800">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-6">
            <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-gray-800">
              {c.specTable.kicker}
            </p>
            <SpecTable
              rows={[
                { label: c.specTable.labels.sku, value: product.sku },
                { label: c.specTable.labels.dimensions, value: formatDimensions(product.dimensions) },
                { label: c.specTable.labels.weight, value: `${product.weight} g` },
                { label: c.specTable.labels.material, value: product.material },
                { label: c.specTable.labels.layerHeight, value: `${product.layerHeight} mm` },
                { label: c.specTable.labels.category, value: category?.name ?? product.category },
                ...product.specs.map((spec) => ({
                  label: spec.label,
                  value: spec.unit ? `${spec.value} ${spec.unit}` : spec.value,
                })),
              ]}
            />
            <p className="m-0 border-t border-gray-100 pt-4 text-small leading-[1.6] text-gray-800">
              {c.specTable.careNoteBefore}{" "}
              <Link
                to="/blog/polycarbonate-care-guide"
                className="text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
              >
                {c.specTable.careLinkLabel}
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mb-14 grid grid-cols-1 gap-8 rounded-xl bg-graphite p-6 text-fog-white md:mb-20 md:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <Image
            src="/images/marketing/macro-layer-lines.jpg"
            alt={c.howItsMade.macroImageAlt}
            width={1200}
            height={800}
            dark
            className="h-[280px] w-full rounded-lg border border-edge object-cover"
          />
          <div className="flex flex-col gap-4">
            <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-titanium">
              {c.howItsMade.kicker}
            </p>
            <h2 className="m-0 text-h2 font-semibold">{c.howItsMade.heading}</h2>
            <p className="m-0 text-body-large leading-[1.7] text-silver [text-wrap:pretty]">{c.howItsMade.body}</p>
            <Link
              to="/blog/from-idea-to-3d-print"
              className="self-start border-b border-titanium pb-1 text-body font-medium text-fog-white no-underline transition-colors duration-fast hover:border-cyan"
            >
              {c.howItsMade.linkLabel}
            </Link>
          </div>
        </section>

        <section id="reviews" className="grid grid-cols-1 gap-10 border-t border-gray-100 py-14 md:py-20 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[104px] lg:self-start">
            <h2 className="m-0 text-h2 font-semibold">{c.reviews.heading}</h2>
            <div className="flex items-baseline gap-3">
              <span dir="ltr" className="font-mono text-display font-medium leading-none">
                {c.ratingValue}
              </span>
              <span className="text-small text-gray-800">{c.reviews.ofLabel}</span>
            </div>
            <div className="flex flex-col gap-2">
              {c.reviews.distribution.map((row) => (
                <div key={row.star} className="flex items-center gap-3">
                  <span dir="ltr" className="w-4 font-mono text-caption text-gray-800">
                    {row.star}
                  </span>
                  <span className="h-1.5 flex-1 rounded-full bg-gray-100">
                    <span className="block h-1.5 rounded-full bg-graphite" style={{ width: `${row.pct}%` }} />
                  </span>
                  <span dir="ltr" className="w-6 font-mono text-caption text-gray-800">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-2 self-start">
              {c.reviews.writeReview}
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {c.reviews.items.map((review) => (
              <article key={review.name} className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-body font-semibold">{review.name}</span>
                  <span dir="ltr" className="font-mono text-micro tracking-[0.06em] text-gray-800">
                    {review.date} &middot; {c.reviews.confirmedPurchase}
                  </span>
                </div>
                <Rating value={review.rating} />
                <p className="m-0 text-body leading-[1.7] text-gray-800">{review.body}</p>
              </article>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="flex flex-col gap-8 border-t border-gray-100 py-14 md:py-20">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="m-0 text-h2 font-semibold">{c.related.heading}</h2>
              {category && (
                <Link
                  to={`/products?category=${category.slug}`}
                  className="text-body font-medium text-graphite no-underline underline-offset-4 hover:underline"
                >
                  {c.related.viewAllTemplate(category.name)}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 z-40 flex items-center gap-4 border-t border-gray-100 bg-white px-5 py-3 lg:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-small font-semibold">{product.name}</span>
          <span dir="ltr" className="font-mono text-small text-gray-800">
            {formatPrice(product.price)}
          </span>
        </div>
        <Button
          variant="primary"
          disabled={isOutOfStock || addToCartMutation.isPending}
          onClick={handleAddToCart}
          className="ms-auto shrink-0"
        >
          {isOutOfStock ? c.outOfStock : addToCartMutation.isPending ? c.addingToCart : c.addToCart}
        </Button>
      </div>
    </div>
  );
}
