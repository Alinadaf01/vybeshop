import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Seo } from "@/components/seo/Seo";
import {
  getCart,
  getAddresses,
  createAddress,
  getShippingMethods,
  getPaymentGateways,
  checkout,
  initiatePayment,
  ApiFieldError,
} from "@/lib/api";
import { addressFormSchema, type AddressFormValues } from "@/lib/authSchema";
import { formatPrice } from "@/lib/formatters";
import { checkoutContent as c } from "@/content/checkout";
import type { Address } from "@/types/address";
import type { PaymentGatewayCode } from "@/types/order";

type Step = "address" | "shipping" | "payment";

const emptyAddressForm: AddressFormValues = {
  title: "",
  receiverName: "",
  postalCode: "",
  receiverPhone: "",
  province: "",
  city: "",
  line: "",
  isDefault: false,
};

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("address");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayCode | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: cart, isLoading: cartLoading, isError: cartError } = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const {
    data: addresses,
    isLoading: addressesLoading,
    isError: addressesLoadError,
    refetch: refetchAddresses,
  } = useQuery({ queryKey: ["addresses"], queryFn: getAddresses });
  const {
    data: shippingMethods,
    isLoading: shippingLoading,
    isError: shippingLoadError,
    refetch: refetchShipping,
  } = useQuery({ queryKey: ["shipping-methods"], queryFn: getShippingMethods });
  const {
    data: gateways,
    isLoading: gatewaysLoading,
    isError: gatewaysLoadError,
    refetch: refetchGateways,
  } = useQuery({ queryKey: ["payment-gateways"], queryFn: getPaymentGateways });

  useEffect(() => {
    if (!selectedAddressId && addresses) {
      const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
      if (preferred) setSelectedAddressId(preferred.id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!selectedShippingId && shippingMethods && shippingMethods.length > 0) {
      setSelectedShippingId(shippingMethods[0].id);
    }
  }, [shippingMethods, selectedShippingId]);

  useEffect(() => {
    if (gateways && gateways.length === 1) setSelectedGateway(gateways[0].code);
  }, [gateways]);

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: emptyAddressForm,
  });

  const saveAddressMutation = useMutation({
    mutationFn: (values: AddressFormValues) => createAddress(values),
    onSuccess: (address: Address) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setSelectedAddressId(address.id);
      setShowAddressForm(false);
      addressForm.reset(emptyAddressForm);
    },
    onError: (error: unknown) => {
      addressForm.setError("root", { message: error instanceof Error ? error.message : c.address.form.saveError });
    },
  });

  const selectedShipping = shippingMethods?.find((s) => s.id === selectedShippingId) ?? null;
  const subtotal = cart?.subtotal ?? 0;
  const estimatedShippingCost = selectedShipping
    ? selectedShipping.freeAbove !== null && subtotal >= selectedShipping.freeAbove
      ? 0
      : selectedShipping.cost
    : null;
  const estimatedTotal = subtotal + (estimatedShippingCost ?? 0);

  const payMutation = useMutation({
    mutationFn: async () => {
      const order = await checkout({
        addressId: selectedAddressId!,
        shippingMethodId: selectedShippingId!,
        couponCode: couponCode.trim() || undefined,
      });
      const { redirectUrl } = await initiatePayment(order.number, selectedGateway!);
      return redirectUrl;
    },
    onSuccess: (redirectUrl) => {
      window.location.href = redirectUrl;
    },
    onError: (error: unknown) => {
      if (error instanceof ApiFieldError && error.field === "gateway_code") {
        refetchGateways();
        setSelectedGateway(null);
      }
      setPaymentError(error instanceof Error ? error.message : c.payment.genericError);
    },
  });

  function handleAddressContinue() {
    if (!selectedAddressId) {
      setAddressError(c.address.selectError);
      return;
    }
    setAddressError(null);
    setStep("shipping");
  }

  function handleShippingContinue() {
    if (!selectedShippingId) {
      setShippingError(c.shipping.selectError);
      return;
    }
    setShippingError(null);
    setStep("payment");
  }

  function handlePaySubmit() {
    setPaymentError(null);
    if (gateways && gateways.length > 1 && !selectedGateway) {
      setPaymentError(c.payment.selectError);
      return;
    }
    if (!termsAccepted) {
      setPaymentError(c.payment.termsError);
      return;
    }
    payMutation.mutate();
  }

  if (cartLoading || addressesLoading) {
    return (
      <div className="mx-auto max-w-page px-5 py-20 xl:px-10">
        <p className="m-0 text-body text-gray-800">{c.loading}</p>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="mx-auto max-w-page px-5 xl:px-10">
        <ErrorState title={c.cartLoadError} description="" action={<Link to="/cart">{c.emptyCart.cta}</Link>} />
      </div>
    );
  }

  // Once a payment attempt has started, checkout() has already emptied the
  // cart server-side — that must never bounce the user to the empty-cart
  // screen mid-payment (or worse, hide a real payment error behind it).
  const paymentAttempted = payMutation.isPending || payMutation.isError || payMutation.isSuccess;

  if (!paymentAttempted && (!cart || cart.items.length === 0)) {
    return (
      <div className="mx-auto max-w-page px-5 xl:px-10">
        <EmptyState
          title={c.emptyCart.heading}
          description={c.emptyCart.body}
          action={
            <Link
              to="/products"
              className="inline-flex h-12 items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink"
            >
              {c.emptyCart.cta}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/checkout" />
      <Breadcrumb
        items={[{ label: "خانه", href: "/" }, { label: "سبد خرید", href: "/cart" }, { label: c.breadcrumbLabel }]}
      />

      <div className="flex flex-col gap-4 pb-12">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
          {(["address", "shipping", "payment"] as Step[]).map((s, index) => {
            const order: Step[] = ["address", "shipping", "payment"];
            const currentIndex = order.indexOf(step);
            const done = index < currentIndex;
            const active = s === step;
            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  dir="ltr"
                  className={
                    "grid size-8 shrink-0 place-items-center rounded-full font-mono text-small " +
                    (done || active ? "bg-graphite text-fog-white" : "border border-silver text-gray-800")
                  }
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className={"text-small " + (active ? "font-medium text-graphite" : "text-gray-800")}>
                  {c.steps[s]}
                </span>
                {index < 2 && <span aria-hidden="true" className="mx-2 hidden h-px w-8 bg-gray-100 md:block" />}
              </li>
            );
          })}
        </ol>
      </div>

      <section className="grid grid-cols-1 gap-12 pb-14 md:pb-20 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div className="flex flex-col gap-4">
          {step === "address" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
              <div className="flex flex-col gap-2">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.address.kicker}
                </span>
                <h2 className="m-0 text-h3 font-semibold">{c.address.heading}</h2>
              </div>

              {addressesLoadError && (
                <div className="flex flex-col items-start gap-3">
                  <p className="m-0 text-body text-danger-ink">{c.address.loadError}</p>
                  <Button variant="secondary" onClick={() => refetchAddresses()}>
                    {c.address.retry}
                  </Button>
                </div>
              )}

              {!addressesLoadError && addresses && addresses.length === 0 && !showAddressForm && (
                <p className="m-0 text-body text-gray-800">{c.address.empty}</p>
              )}

              {!addressesLoadError && addresses && addresses.length > 0 && (
                <div className="flex flex-col gap-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={
                        "flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-white p-4 " +
                        (selectedAddressId === address.id ? "border-graphite" : "border-gray-100")
                      }
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="mt-1 size-[18px] shrink-0 accent-graphite"
                      />
                      <span className="flex flex-1 flex-col gap-1">
                        <span className="text-body font-medium">
                          {address.title} — {address.receiverName}
                        </span>
                        <span className="text-small leading-[1.7] text-gray-800">
                          {address.province}، {address.city}، {address.line} — کد پستی{" "}
                          <span dir="ltr" className="font-mono">
                            {address.postalCode}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {!showAddressForm && (
                <Button
                  type="button"
                  variant="secondary"
                  className="self-start"
                  onClick={() => setShowAddressForm(true)}
                >
                  {c.address.addNew}
                </Button>
              )}

              {showAddressForm && (
                <form
                  noValidate
                  onSubmit={addressForm.handleSubmit((values) => saveAddressMutation.mutate(values))}
                  className="flex flex-col gap-6 border-t border-gray-100 pt-6"
                >
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Input
                      label={c.address.form.titleLabel}
                      placeholder={c.address.form.titlePlaceholder}
                      error={addressForm.formState.errors.title?.message}
                      {...addressForm.register("title")}
                    />
                    <Input
                      label={c.address.form.nameLabel}
                      placeholder={c.address.form.namePlaceholder}
                      error={addressForm.formState.errors.receiverName?.message}
                      {...addressForm.register("receiverName")}
                    />
                    <Input
                      label={c.address.form.provinceLabel}
                      error={addressForm.formState.errors.province?.message}
                      {...addressForm.register("province")}
                    />
                    <Input
                      label={c.address.form.cityLabel}
                      error={addressForm.formState.errors.city?.message}
                      {...addressForm.register("city")}
                    />
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      label={c.address.form.postalLabel}
                      placeholder={c.address.form.postalPlaceholder}
                      className="font-mono"
                      error={addressForm.formState.errors.postalCode?.message}
                      {...addressForm.register("postalCode")}
                    />
                    <Input
                      dir="ltr"
                      type="tel"
                      inputMode="numeric"
                      label={c.address.form.phoneLabel}
                      placeholder={c.address.form.phonePlaceholder}
                      className="font-mono"
                      error={addressForm.formState.errors.receiverPhone?.message}
                      {...addressForm.register("receiverPhone")}
                    />
                  </div>
                  <Textarea
                    rows={3}
                    label={c.address.form.lineLabel}
                    placeholder={c.address.form.linePlaceholder}
                    error={addressForm.formState.errors.line?.message}
                    {...addressForm.register("line")}
                  />
                  <Checkbox label={c.address.form.defaultLabel} {...addressForm.register("isDefault")} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" loading={saveAddressMutation.isPending}>
                      {saveAddressMutation.isPending ? c.address.form.saving : c.address.form.save}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowAddressForm(false)}>
                      {c.address.cancelAddNew}
                    </Button>
                  </div>
                  {addressForm.formState.errors.root && (
                    <p className="m-0 text-small text-danger-ink">{addressForm.formState.errors.root.message}</p>
                  )}
                </form>
              )}

              {addressError && <p className="m-0 text-small text-danger-ink">{addressError}</p>}
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                <Button onClick={handleAddressContinue}>{c.address.continueCta}</Button>
                <Link to="/cart" className="text-small text-gray-800 underline decoration-silver underline-offset-4">
                  بازگشت به سبد
                </Link>
              </div>
            </div>
          )}

          {step === "shipping" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
              <div className="flex flex-col gap-2">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.shipping.kicker}
                </span>
                <h2 className="m-0 text-h3 font-semibold">{c.shipping.heading}</h2>
              </div>

              {shippingLoading && <p className="m-0 text-body text-gray-800">{c.shipping.loading}</p>}

              {shippingLoadError && (
                <div className="flex flex-col items-start gap-3">
                  <p className="m-0 text-body text-danger-ink">{c.shipping.loadError}</p>
                  <Button variant="secondary" onClick={() => refetchShipping()}>
                    {c.shipping.retry}
                  </Button>
                </div>
              )}

              {!shippingLoadError && shippingMethods && shippingMethods.length === 0 && (
                <p className="m-0 text-body text-gray-800">{c.shipping.empty}</p>
              )}

              {!shippingLoadError && shippingMethods && shippingMethods.length > 0 && (
                <div className="flex flex-col gap-3">
                  {shippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={
                        "flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-white p-4 " +
                        (selectedShippingId === method.id ? "border-graphite" : "border-gray-100")
                      }
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShippingId === method.id}
                        onChange={() => setSelectedShippingId(method.id)}
                        className="mt-1 size-[18px] shrink-0 accent-graphite"
                      />
                      <span className="flex flex-1 flex-col gap-1">
                        <span className="text-body font-medium">{method.name}</span>
                        <span className="text-small text-gray-800">
                          {method.estimatedDays}
                          {method.freeAbove !== null && ` · ${c.shipping.freeAboveTemplate(formatPrice(method.freeAbove))}`}
                        </span>
                      </span>
                      <span dir="ltr" className="font-mono text-body">
                        {method.cost === 0 ? "رایگان" : formatPrice(method.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {shippingError && <p className="m-0 text-small text-danger-ink">{shippingError}</p>}
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                <Button onClick={handleShippingContinue}>{c.shipping.continueCta}</Button>
                <Button variant="secondary" onClick={() => setStep("address")}>
                  {c.shipping.back}
                </Button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
              <div className="flex flex-col gap-2">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.payment.kicker}
                </span>
                <h2 className="m-0 text-h3 font-semibold">{c.payment.heading}</h2>
              </div>

              {gatewaysLoading && <p className="m-0 text-body text-gray-800">{c.payment.loading}</p>}

              {gatewaysLoadError && (
                <div className="flex flex-col items-start gap-3">
                  <p className="m-0 text-body text-danger-ink">{c.payment.loadError}</p>
                  <Button variant="secondary" onClick={() => refetchGateways()}>
                    {c.payment.retry}
                  </Button>
                </div>
              )}

              {!gatewaysLoadError && gateways && gateways.length === 0 && (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-ink bg-white p-4">
                  <span className="text-body font-medium text-danger-ink">{c.payment.unavailableHeading}</span>
                  <p className="m-0 text-small text-gray-800">{c.payment.unavailableBody}</p>
                  <Link
                    to="/contact"
                    className="text-small text-graphite underline decoration-silver underline-offset-4"
                  >
                    {c.payment.contactCta}
                  </Link>
                </div>
              )}

              {!gatewaysLoadError && gateways && gateways.length === 1 && (
                <div className="flex items-center gap-3 rounded-lg border-2 border-graphite bg-white p-4">
                  {gateways[0].logo && (
                    <img src={gateways[0].logo} alt="" className="h-8 w-[72px] shrink-0 object-contain" />
                  )}
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-small font-medium">{gateways[0].name}</span>
                    {gateways[0].description && (
                      <span className="text-caption text-gray-800">{gateways[0].description}</span>
                    )}
                  </span>
                </div>
              )}

              {!gatewaysLoadError && gateways && gateways.length > 1 && (
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 p-0 text-small font-medium">{c.payment.selectGatewayLegend}</legend>
                  {gateways.map((gateway) => (
                    <label
                      key={gateway.code}
                      className={
                        "flex cursor-pointer items-center gap-3 rounded-md border-2 bg-white p-3 " +
                        (selectedGateway === gateway.code ? "border-graphite" : "border-gray-100")
                      }
                    >
                      <input
                        type="radio"
                        name="gateway"
                        checked={selectedGateway === gateway.code}
                        onChange={() => setSelectedGateway(gateway.code)}
                        className="size-[18px] shrink-0 accent-graphite"
                      />
                      {gateway.logo && <img src={gateway.logo} alt="" className="h-8 w-[72px] shrink-0 object-contain" />}
                      <span className="flex flex-1 flex-col gap-1">
                        <span className="text-small font-medium text-graphite">{gateway.name}</span>
                        {gateway.description && (
                          <span className="text-caption text-gray-800">{gateway.description}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              <label className="flex flex-col gap-2 text-small font-medium">
                {c.payment.couponLabel}
                <input
                  dir="ltr"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={c.payment.couponPlaceholder}
                  className="h-12 w-full rounded-md border border-silver bg-white px-3 font-mono text-body text-graphite outline-none hover:border-titanium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                />
              </label>

              <Checkbox
                label={c.payment.termsLabel}
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />

              {paymentError && <p className="m-0 text-small text-danger-ink">{paymentError}</p>}

              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                <Button
                  onClick={handlePaySubmit}
                  disabled={payMutation.isPending || (gateways?.length ?? 0) === 0}
                  loading={payMutation.isPending}
                >
                  {payMutation.isPending ? c.payment.redirecting : c.payment.payCtaTemplate(formatPrice(estimatedTotal))}
                </Button>
                <Button variant="secondary" onClick={() => setStep("shipping")} disabled={payMutation.isPending}>
                  {c.payment.back}
                </Button>
              </div>
              {payMutation.isPending && <p className="m-0 text-caption text-gray-800">{c.payment.redirectingHint}</p>}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[104px] lg:self-start">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
            <h2 className="m-0 text-h3 font-semibold">{c.summary.heading}</h2>
            <dl className="m-0 flex flex-col">
              <div className="flex justify-between gap-3 border-b border-gray-100 py-3">
                <dt className="text-small text-gray-800">{c.summary.subtotalLabel}</dt>
                <dd dir="ltr" className="m-0 font-mono text-body">
                  {formatPrice(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-small text-gray-800">{c.summary.shippingLabel}</dt>
                <dd dir="ltr" className="m-0 font-mono text-body">
                  {estimatedShippingCost === null
                    ? c.summary.shippingPending
                    : estimatedShippingCost === 0
                      ? "رایگان"
                      : formatPrice(estimatedShippingCost)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-gray-100 pt-3">
                <dt className="text-body font-semibold">{c.summary.payableLabel}</dt>
                <dd dir="ltr" className="m-0 font-mono text-h4 font-semibold">
                  {formatPrice(estimatedTotal)}
                </dd>
              </div>
            </dl>
            <Link to="/cart" className="self-start text-small text-gray-800 underline decoration-silver underline-offset-4">
              {c.summary.editCartLink}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
