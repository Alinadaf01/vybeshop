import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts, type ProductOrdering } from "@/lib/api";
import { categories } from "@/data/categories";
import { getProductsByCategory, products as allProducts } from "@/data/products";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { PriceRangeSlider } from "@/components/ui/PriceRangeSlider";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProductCard } from "@/components/product/ProductCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatPrice } from "@/lib/formatters";
import { productsContent as c } from "@/content/products";

const PAGE_SIZE = 12;
const PRICE_MIN = 0;
const PRICE_MAX = Math.ceil(Math.max(...allProducts.map((p) => p.price)) / 100000) * 100000;

function readParams(searchParams: URLSearchParams) {
  const category = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q") ?? "";
  const min = searchParams.get("min") ? Number(searchParams.get("min")) : PRICE_MIN;
  const max = searchParams.get("max") ? Number(searchParams.get("max")) : PRICE_MAX;
  const inStock = searchParams.get("inStock") === "1";
  const sort = (searchParams.get("sort") ?? "") as ProductOrdering | "";
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  return { category, q, min, max, inStock, sort, page };
}

interface FiltersPanelProps {
  selectedCategory: string | undefined;
  onCategoryChange: (slug: string | undefined) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  onClearAll: () => void;
}

function FiltersPanel({
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  inStockOnly,
  onInStockChange,
  onClearAll,
}: FiltersPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 pb-4">
        <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
          {c.filters.kicker}
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="border-0 bg-transparent p-0 text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
        >
          {c.filters.clearAll}
        </button>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-small font-semibold">{c.filters.category}</legend>
        {categories.map((category) => {
          const count = getProductsByCategory(category.slug).length;
          const checked = selectedCategory === category.slug;
          return (
            <label key={category.slug} className="flex min-h-11 cursor-pointer items-center gap-3 text-small">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onCategoryChange(checked ? undefined : category.slug)}
                className="size-[18px] shrink-0 accent-graphite"
              />
              <span className="flex-1">{category.name}</span>
              <span dir="ltr" className="font-mono text-micro text-gray-800">
                {count}
              </span>
            </label>
          );
        })}
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 border-t border-gray-100 p-0 pt-6">
        <legend className="mb-2 p-0 text-small font-semibold">{c.filters.price}</legend>
        <PriceRangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          value={priceRange}
          onChange={onPriceRangeChange}
          step={50000}
          formatValue={formatPrice}
        />
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 border-t border-gray-100 p-0 pt-6">
        <legend className="mb-2 p-0 text-small font-semibold">{c.filters.availability}</legend>
        <Checkbox label={c.filters.inStockOnly} checked={inStockOnly} onChange={(e) => onInStockChange(e.target.checked)} />
      </fieldset>
    </div>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { category, q, min, max, inStock, sort, page } = readParams(searchParams);

  const [searchInput, setSearchInput] = useState(q);
  const deferredSearch = useDeferredValue(searchInput);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  function updateParams(patch: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (deferredSearch !== q) {
      updateParams({ q: deferredSearch || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch]);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["products", { category, q, min, max, inStock, sort, page }],
    queryFn: () =>
      getProducts({
        category,
        search: q || undefined,
        minPrice: min > PRICE_MIN ? min : undefined,
        maxPrice: max < PRICE_MAX ? max : undefined,
        inStock: inStock || undefined,
        ordering: sort || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const activeCategory = category ? categories.find((cat) => cat.slug === category) : undefined;
  const hasActiveFilters = !!category || min > PRICE_MIN || max < PRICE_MAX || inStock;
  const pageCount = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const filtersPanelProps: FiltersPanelProps = {
    selectedCategory: category,
    onCategoryChange: (slug) => updateParams({ category: slug }),
    priceRange: [min, max],
    onPriceRangeChange: ([nextMin, nextMax]) =>
      updateParams({ min: nextMin > PRICE_MIN ? String(nextMin) : undefined, max: nextMax < PRICE_MAX ? String(nextMax) : undefined }),
    inStockOnly: inStock,
    onInStockChange: (value) => updateParams({ inStock: value ? "1" : undefined }),
    onClearAll: () => setSearchParams(new URLSearchParams(), { replace: true }),
  };

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.heading }]} />

      <div className="flex flex-col gap-4 pb-10">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        <p className="m-0 max-w-text text-body-large text-gray-800">{c.subtitleTemplate(allProducts.length)}</p>
      </div>

      <div className="grid grid-cols-1 gap-10 pb-14 md:pb-20 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:sticky lg:top-[104px] lg:flex lg:max-h-[calc(100vh-128px)] lg:flex-col lg:self-start lg:overflow-y-auto">
          <FiltersPanel {...filtersPanelProps} />
        </aside>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-gray-100 pb-4">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={c.searchPlaceholder}
              aria-label={c.searchLabel}
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-small text-gray-800">
                {data ? c.resultsTemplate(data.results.length, data.count) : "…"}
              </span>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {activeCategory && (
                    <Tag onRemove={() => updateParams({ category: undefined })}>{activeCategory.name}</Tag>
                  )}
                  {(min > PRICE_MIN || max < PRICE_MAX) && (
                    <Tag onRemove={() => updateParams({ min: undefined, max: undefined })}>
                      {c.activeFilters.priceRangeTemplate(formatPrice(min), formatPrice(max))}
                    </Tag>
                  )}
                  {inStock && <Tag onRemove={() => updateParams({ inStock: undefined })}>{c.activeFilters.inStockChip}</Tag>}
                </div>
              )}
              <div className="ms-auto flex items-center gap-3">
                <Button variant="secondary" className="h-11 lg:hidden" onClick={() => setFiltersOpen(true)}>
                  {c.filters.openButton}
                </Button>
                <Select
                  aria-label="مرتب‌سازی"
                  value={sort}
                  onChange={(e) => updateParams({ sort: e.target.value || undefined })}
                  className="w-auto"
                >
                  {c.sort.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
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
            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
              ))}
            </div>
          ) : data && data.results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
                {data.results.map((product) => (
                  <ProductCard key={product.slug} product={product} />
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
                <Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}>
                  {c.empty.action}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={c.filters.title}>
        <FiltersPanel {...filtersPanelProps} />
      </BottomSheet>
    </div>
  );
}
