import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Image } from "@/components/ui/Image";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Seo } from "@/components/seo/Seo";
import { getCart, updateCartItem, removeCartItem, addFavorite } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/lib/useToast";
import { loadFavoriteIds, saveFavoriteIds } from "@/lib/favoritesStorage";
import { cartContent as c } from "@/content/cart";
import { favoritesContent } from "@/content/favorites";
import type { CartItem } from "@/types/cart";

export default function CartPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { data: cart, isLoading, isError } = useQuery({ queryKey: ["cart"], queryFn: getCart });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => updateCartItem(id, quantity),
    onSuccess: (updated) => queryClient.setQueryData(["cart"], updated),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeCartItem(id),
    onSuccess: (updated) => queryClient.setQueryData(["cart"], updated),
  });

  const moveToFavoritesMutation = useMutation({
    mutationFn: async (item: CartItem) => {
      if (isAuthenticated) {
        const updatedFavorites = await addFavorite(item.product.id);
        queryClient.setQueryData(["favorites"], updatedFavorites);
      } else {
        const ids = loadFavoriteIds();
        if (!ids.includes(item.product.id)) saveFavoriteIds([...ids, item.product.id]);
      }
      return removeCartItem(item.id);
    },
    onSuccess: (updatedCart) => queryClient.setQueryData(["cart"], updatedCart),
    onError: () => showToast({ variant: "danger", message: favoritesContent.toast.error }),
  });

  async function clearCart() {
    if (!cart) return;
    for (const item of cart.items) {
      await removeCartItem(item.id);
    }
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  }

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/cart" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.breadcrumbLabel }]} />

      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-12">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        {cart && cart.items.length > 0 && (
          <span className="text-small text-gray-800">
            {c.itemsCountTemplate(cart.items.length, cart.itemCount)}
          </span>
        )}
      </div>

      {isLoading && <p className="pb-20 text-body text-gray-800">در حال بارگذاری…</p>}

      {isError && (
        <ErrorState
          title={c.error.heading}
          description={c.error.body}
          action={
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["cart"] })}>
              {c.error.retry}
            </Button>
          }
        />
      )}

      {cart && cart.items.length === 0 && (
        <EmptyState
          title={c.empty.heading}
          description={c.empty.body}
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                to="/products"
                className="inline-flex h-12 items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink"
              >
                {c.empty.productsCta}
              </Link>
              <Link
                to="/categories"
                className="inline-flex h-12 items-center rounded-md border border-silver bg-white px-6 text-body font-medium text-graphite no-underline hover:border-titanium"
              >
                {c.empty.categoriesCta}
              </Link>
            </div>
          }
        />
      )}

      {cart && cart.items.length > 0 && (
        <section className="grid grid-cols-1 gap-12 pb-14 md:pb-20 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
              {cart.items.map((item, index) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  bordered={index < cart.items.length - 1}
                  onQuantityChange={(quantity) => updateMutation.mutate({ id: item.id, quantity })}
                  onRemove={() => removeMutation.mutate(item.id)}
                  onMoveToFavorites={() => moveToFavoritesMutation.mutate(item)}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/products"
                className="text-small font-medium text-graphite no-underline underline-offset-4 hover:underline"
              >
                {c.continueShoppingLink}
              </Link>
              <Button variant="secondary" className="h-11 px-4 text-small" onClick={clearCart}>
                {c.clearCart}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-[104px] lg:self-start">
            <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
              <h2 className="m-0 text-h3 font-semibold">{c.summary.heading}</h2>
              <dl className="m-0 flex flex-col">
                <div className="flex justify-between gap-3 py-3">
                  <dt className="text-small text-gray-800">{c.summary.subtotalLabel}</dt>
                  <dd dir="ltr" className="m-0 font-mono text-body font-semibold">
                    {formatPrice(cart.subtotal)}
                  </dd>
                </div>
              </dl>
              <Link
                to="/checkout"
                className="flex h-12 items-center justify-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink"
              >
                {c.summary.checkoutCta}
              </Link>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-4">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                {c.shippingNote.kicker}
              </span>
              <p className="m-0 text-small leading-[1.7] text-gray-800">{c.shippingNote.body}</p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

function CartItemRow({
  item,
  bordered,
  onQuantityChange,
  onRemove,
  onMoveToFavorites,
}: {
  item: CartItem;
  bordered: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onMoveToFavorites: () => void;
}) {
  return (
    <div
      className={
        "flex flex-col gap-3 md:flex-row md:items-start md:gap-4" + (bordered ? " border-b border-gray-100 pb-6" : "")
      }
    >
      <Link
        to={`/products/${item.product.slug}`}
        className="block aspect-square w-full shrink-0 overflow-hidden rounded-md border border-gray-100 no-underline md:w-28"
      >
        {item.product.image && (
          <Image src={item.product.image} alt={item.product.name} width={112} height={112} className="size-full object-cover" />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <Link
          to={`/products/${item.product.slug}`}
          className="text-body font-semibold text-graphite no-underline [text-wrap:pretty] hover:underline"
        >
          {item.product.name}
        </Link>
        {item.colorOption && (
          <span className="text-small text-gray-800">رنگ فیلامنت: {item.colorOption.name}</span>
        )}
        <span dir="ltr" className={"font-mono text-micro " + (item.product.inStock ? "text-success-ink" : "text-danger-ink")}>
          {item.product.inStock ? c.inStock : c.outOfStock}
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={item.quantity}
            max={item.product.stockCount}
            onChange={onQuantityChange}
            aria-label={`تعداد ${item.product.name}`}
          />
          <button
            type="button"
            onClick={onRemove}
            className="border-0 bg-transparent p-0 text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
          >
            {c.remove}
          </button>
          <button
            type="button"
            onClick={onMoveToFavorites}
            className="border-0 bg-transparent p-0 text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
          >
            {c.moveToFavorites}
          </button>
        </div>
      </div>
      <span dir="ltr" className="font-mono text-body text-graphite md:text-end">
        {formatPrice(item.lineTotal)}
      </span>
    </div>
  );
}
