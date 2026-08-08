import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Seo } from "@/components/seo/Seo";
import { checkoutContent as c } from "@/content/checkout";

export default function CheckoutCallbackPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const orderNumber = searchParams.get("order");
  const success = searchParams.get("status") === "success";

  useEffect(() => {
    // The order that was just paid moved from `pending`; the cart the
    // gateway callback emptied server-side (via checkout()) is also stale.
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  }, [queryClient]);

  return (
    <div className="mx-auto max-w-page px-5 py-20 xl:px-10">
      <Seo title={c.callback.seo.title} description={c.callback.seo.description} path="/checkout/callback" />
      <div className="mx-auto flex max-w-text flex-col items-start gap-4 rounded-xl border border-gray-100 bg-white p-6 md:p-12">
        {success ? (
          <>
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full bg-success-ink text-h4 text-white"
            >
              ✓
            </span>
            <h1 className="m-0 text-h2 font-bold">{c.callback.successHeading}</h1>
            {orderNumber && <p className="m-0 text-body leading-[1.7] text-gray-800">{c.callback.successBodyTemplate(orderNumber)}</p>}
            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <Link
                to="/account"
                className="inline-flex h-12 items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink"
              >
                {c.callback.trackOrderCta}
              </Link>
              <Link
                to="/products"
                className="inline-flex h-12 items-center rounded-md border border-silver bg-white px-6 text-body font-medium text-graphite no-underline hover:border-titanium"
              >
                {c.callback.continueShoppingCta}
              </Link>
            </div>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full bg-danger-ink text-h4 text-white"
            >
              ✕
            </span>
            <h1 className="m-0 text-h2 font-bold">{c.callback.failureHeading}</h1>
            <p className="m-0 text-body leading-[1.7] text-gray-800">{c.callback.failureBody}</p>
            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <Link
                to="/cart"
                className="inline-flex h-12 items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink"
              >
                {c.callback.retryCta}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
