import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/product/ProductCard";
import { Seo } from "@/components/seo/Seo";
import {
  getMe,
  updateMe,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getOrders,
  getOrder,
  getFavorites,
  removeFavorite,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/lib/useToast";
import { profileFormSchema, addressFormSchema, type ProfileFormValues, type AddressFormValues } from "@/lib/authSchema";
import { accountContent as c, orderStatusLabel } from "@/content/account";
import { favoritesContent as fc } from "@/content/favorites";
import { formatPrice, formatJalaliDateTime } from "@/lib/formatters";
import type { Address } from "@/types/address";
import type { OrderStatus, OrderSummary } from "@/types/order";

type Tab = "orders" | "detail" | "addresses" | "favorites" | "profile";

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "border border-silver text-gray-800",
  paid: "border border-cyan text-graphite",
  processing: "border border-silver text-warning-ink",
  shipped: "bg-graphite text-fog-white",
  delivered: "border border-success-ink text-success-ink",
  canceled: "border border-danger-ink text-danger-ink",
  returned: "border border-danger-ink text-danger-ink",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  pending: "bg-silver",
  paid: "bg-cyan",
  processing: "bg-warning",
  shipped: "bg-cyan",
  delivered: "bg-success",
  canceled: "bg-danger",
  returned: "bg-danger",
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`flex items-center gap-2 rounded-full px-2 py-0.5 text-caption ${STATUS_BADGE[status]}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {orderStatusLabel[status]}
    </span>
  );
}

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

export default function AccountPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>("orders");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // --- Orders ---
  const {
    data: ordersPage,
    isLoading: ordersLoading,
    isError: ordersLoadError,
    refetch: refetchOrders,
  } = useQuery({ queryKey: ["orders"], queryFn: getOrders });
  const orders = ordersPage?.results ?? [];
  const visibleOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const {
    data: selectedOrder,
    isLoading: orderDetailLoading,
    isError: orderDetailLoadError,
    refetch: refetchOrderDetail,
  } = useQuery({
    queryKey: ["order", selectedOrderNumber],
    queryFn: () => getOrder(selectedOrderNumber!),
    enabled: !!selectedOrderNumber,
  });

  function openOrderDetail(order: OrderSummary) {
    setSelectedOrderNumber(order.number);
    setTab("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLogout() {
    logout();
    navigate("/auth");
  }

  // --- Addresses ---
  const { data: addresses, isLoading: addressesLoading, isError: addressesLoadError } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
  });

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: emptyAddressForm,
  });

  const saveAddressMutation = useMutation({
    mutationFn: (values: AddressFormValues) =>
      editingAddress ? updateAddress(editingAddress.id, values) : createAddress(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setShowAddressForm(false);
      setEditingAddress(null);
      addressForm.reset(emptyAddressForm);
    },
    onError: (error: unknown) => {
      addressForm.setError("root", { message: error instanceof Error ? error.message : c.addresses.form.saveError });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => updateAddress(id, { isDefault: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  function openAddressForm(address: Address | null) {
    setEditingAddress(address);
    addressForm.reset(
      address
        ? {
            title: address.title,
            receiverName: address.receiverName,
            postalCode: address.postalCode,
            receiverPhone: address.receiverPhone,
            province: address.province,
            city: address.city,
            line: address.line,
            isDefault: address.isDefault,
          }
        : emptyAddressForm,
    );
    setShowAddressForm(true);
  }

  // --- Favorites ---
  const {
    data: favorites,
    isLoading: favoritesLoading,
    isError: favoritesLoadError,
    refetch: refetchFavorites,
  } = useQuery({ queryKey: ["favorites"], queryFn: getFavorites });

  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: string) => removeFavorite(productId),
    onSuccess: (updated) => queryClient.setQueryData(["favorites"], updated),
    onError: () => showToast({ variant: "danger", message: fc.toast.error }),
  });

  // --- Profile ---
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, initialData: user ?? undefined });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: me ? { fullName: `${me.firstName} ${me.lastName}`.trim(), email: me.email ?? "" } : undefined,
  });
  const [profileSaved, setProfileSaved] = useState(false);

  async function onProfileSubmit(values: ProfileFormValues) {
    setProfileSaved(false);
    const [firstName, ...rest] = values.fullName.trim().split(/\s+/);
    try {
      const updated = await updateMe({ firstName, lastName: rest.join(" "), email: values.email || null });
      updateUser(updated);
      queryClient.setQueryData(["me"], updated);
      setProfileSaved(true);
    } catch (error) {
      profileForm.setError("fullName", {
        message: error instanceof Error ? error.message : c.profile.saveError,
      });
    }
  }

  const initials = me ? `${me.firstName.charAt(0)}${me.lastName.charAt(0)}`.trim() || me.phone.slice(-2) : "";

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/account" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.breadcrumbLabel }]} />

      <div className="flex flex-wrap items-center gap-3 pb-12">
        <span dir="ltr" aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-gray-100 font-mono text-small text-gray-800">
          {initials}
        </span>
        <div className="flex flex-col">
          <h1 className="m-0 text-h2 font-semibold">{me ? me.firstName || me.phone : ""}</h1>
          <span dir="ltr" className="font-mono text-small text-gray-800">
            {me?.phone}
          </span>
        </div>
        <Button variant="secondary" className="ms-auto" onClick={handleLogout}>
          {c.logout}
        </Button>
      </div>

      <section className="flex flex-col gap-8 pb-14 md:pb-20">
        <div className="flex gap-6 overflow-x-auto border-b border-gray-100" role="tablist">
          {(["orders", "detail", "addresses", "favorites", "profile"] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={
                "whitespace-nowrap border-0 border-b-2 bg-transparent pb-2 text-body " +
                (tab === id ? "border-graphite font-medium text-graphite" : "border-transparent text-gray-800 hover:text-graphite")
              }
            >
              {c.tabs[id]}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-h3 font-semibold">{c.orders.heading}</h2>
              <span className="text-small text-gray-800">{c.orders.countTemplate(orders.length)}</span>
              <label className="ms-auto flex items-center gap-2 text-small text-gray-800">
                وضعیت
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | OrderStatus)}
                  className="h-11 w-auto"
                >
                  <option value="all">همه</option>
                  {(Object.keys(orderStatusLabel) as OrderStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabel[status]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            {ordersLoading && <p className="m-0 text-body text-gray-800">{c.orders.loading}</p>}

            {ordersLoadError && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-100 bg-white p-12">
                <p className="m-0 text-body text-danger-ink">{c.orders.loadError}</p>
                <Button variant="secondary" onClick={() => refetchOrders()}>
                  {c.orders.retry}
                </Button>
              </div>
            )}

            {!ordersLoading && !ordersLoadError && visibleOrders.length === 0 && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-100 bg-white p-12">
                <h3 className="m-0 text-h3 font-semibold">{c.orders.empty.heading}</h3>
                <p className="m-0 text-body leading-[1.7] text-gray-800">{c.orders.empty.body}</p>
                <Link to="/products" className="inline-flex h-12 items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink">
                  {c.orders.empty.cta}
                </Link>
              </div>
            )}

            {!ordersLoading && !ordersLoadError && visibleOrders.length > 0 && (
              <div className="flex flex-col rounded-xl border border-gray-100 bg-white px-4 md:px-12">
                {visibleOrders.map((order, index) => (
                  <div
                    key={order.number}
                    className={
                      "flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6" +
                      (index < visibleOrders.length - 1 ? " border-b border-gray-100" : "")
                    }
                  >
                    <div className="flex flex-col gap-1 md:w-[200px]">
                      <span dir="ltr" className="font-mono text-body text-graphite">
                        {order.number}
                      </span>
                      <span dir="ltr" className="font-mono text-micro text-gray-800">
                        {formatJalaliDateTime(order.createdAt)} · {order.itemCount} قلم
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <span dir="ltr" className="font-mono text-body md:ms-auto">
                      {formatPrice(order.total)}
                    </span>
                    <Button variant="secondary" className="h-11 shrink-0 px-4 text-small" onClick={() => openOrderDetail(order)}>
                      {c.orders.detailsCta}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "detail" && !selectedOrderNumber && (
          <p className="m-0 text-body text-gray-800">{c.detail.selectPrompt(c.tabs.orders)}</p>
        )}

        {tab === "detail" && selectedOrderNumber && orderDetailLoading && (
          <p className="m-0 text-body text-gray-800">{c.detail.loading}</p>
        )}

        {tab === "detail" && selectedOrderNumber && orderDetailLoadError && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-100 bg-white p-12">
            <p className="m-0 text-body text-danger-ink">{c.detail.loadError}</p>
            <Button variant="secondary" onClick={() => refetchOrderDetail()}>
              {c.detail.retry}
            </Button>
          </div>
        )}

        {tab === "detail" && selectedOrder && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" className="h-11 px-4 text-small" onClick={() => setTab("orders")}>
                &#8594; {c.detail.back}
              </Button>
              <h2 className="m-0 text-h3 font-semibold">{c.detail.orderTitle(selectedOrder.number)}</h2>
              <OrderStatusBadge status={selectedOrder.status} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
                  <h3 className="m-0 text-h4 font-semibold">{c.detail.statusHeading}</h3>
                  {(() => {
                    const steps = [
                      { label: c.detail.orderCreated, timestamp: selectedOrder.createdAt },
                      ...selectedOrder.statusLogs.map((log) => ({
                        label: orderStatusLabel[log.toStatus as OrderStatus] ?? log.toStatus,
                        timestamp: log.createdAt,
                      })),
                    ];
                    return (
                      <ol className="m-0 flex list-none flex-col p-0">
                        {steps.map((step, index) => (
                          <li key={`${step.label}-${step.timestamp}`} className="flex gap-3">
                            <span className="flex flex-col items-center">
                              <span
                                aria-hidden="true"
                                className="grid size-6 shrink-0 place-items-center rounded-full bg-graphite font-mono text-micro text-fog-white"
                              >
                                ✓
                              </span>
                              {index < steps.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-graphite" />}
                            </span>
                            <span className="flex flex-col gap-1 pb-4">
                              <span className="text-body font-medium text-graphite">{step.label}</span>
                              <span dir="ltr" className="font-mono text-micro text-gray-800">
                                {formatJalaliDateTime(step.timestamp)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    );
                  })()}
                  <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                    <span dir="ltr" className="font-mono text-small text-gray-800">
                      {c.detail.trackingLabel}
                    </span>
                    <span dir="ltr" className="font-mono text-small text-graphite">
                      {selectedOrder.trackingCode || `— ${c.detail.trackingPending}`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 md:p-12">
                  <h3 className="m-0 text-h4 font-semibold">{c.detail.itemsHeading}</h3>
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={item.id}
                      className={"flex gap-3" + (index < selectedOrder.items.length - 1 ? " border-b border-gray-100 pb-3" : "")}
                    >
                      <span className="flex aspect-square w-[72px] shrink-0 items-end rounded-md border border-gray-100 bg-[repeating-linear-gradient(135deg,#ECECEC_0_8px,#F5F5F3_8px_16px)] p-1">
                        <span dir="ltr" className="font-mono text-micro text-gray-800">
                          {item.sku}
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col gap-1">
                        <span className="text-body font-medium">{item.productName}</span>
                        <span className="text-small text-gray-800">
                          {item.colorName ? `${item.colorName} · ` : ""}
                          {item.quantity} عدد
                        </span>
                      </span>
                      <span dir="ltr" className="font-mono text-small">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4">
                  <h3 className="m-0 text-h4 font-semibold">{c.detail.paymentHeading}</h3>
                  <dl className="m-0 flex flex-col">
                    <div className="flex justify-between gap-3 border-b border-gray-100 py-2">
                      <dt className="text-small text-gray-800">{c.detail.subtotalLabel}</dt>
                      <dd dir="ltr" className="m-0 font-mono text-small">
                        {formatPrice(selectedOrder.subtotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-gray-100 py-2">
                      <dt className="text-small text-gray-800">{c.detail.discountLabel}</dt>
                      <dd dir="ltr" className="m-0 font-mono text-small text-success-ink">
                        {selectedOrder.discount > 0 ? `−${formatPrice(selectedOrder.discount)}` : "0"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-gray-100 py-2">
                      <dt className="text-small text-gray-800">{c.detail.shippingLabel}</dt>
                      <dd dir="ltr" className="m-0 font-mono text-small">
                        {formatPrice(selectedOrder.shippingCost)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 py-2">
                      <dt className="text-body font-semibold">{c.detail.totalLabel}</dt>
                      <dd dir="ltr" className="m-0 font-mono text-body font-semibold">
                        {formatPrice(selectedOrder.total)}
                      </dd>
                    </div>
                  </dl>
                  {selectedOrder.payments.length > 0 ? (
                    (() => {
                      const payment = selectedOrder.payments[selectedOrder.payments.length - 1];
                      return (
                        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-small text-gray-800">{c.detail.gatewayLabel}</span>
                            <span dir="ltr" className="rounded-sm border border-gray-100 bg-fog-white px-2 py-0.5 font-mono text-micro text-gray-800">
                              {payment.gateway}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-small text-gray-800">{c.detail.refIdLabel}</span>
                            <span dir="ltr" className="font-mono text-small text-graphite">
                              {payment.refId || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-small text-gray-800">{c.detail.paidAtLabel}</span>
                            <span dir="ltr" className="font-mono text-small text-gray-800">
                              {payment.verifiedAt ? formatJalaliDateTime(payment.verifiedAt) : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="m-0 border-t border-gray-100 pt-3 text-small text-gray-800">{c.detail.noPayments}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4">
                  <h3 className="m-0 text-h4 font-semibold">{c.detail.addressHeading}</h3>
                  <p className="m-0 text-small leading-[1.7] text-gray-800">
                    {selectedOrder.shippingAddress.receiverName} — {selectedOrder.shippingAddress.province}،{" "}
                    {selectedOrder.shippingAddress.city}، {selectedOrder.shippingAddress.line}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="h-11 px-4 text-small" disabled title={c.detail.invoiceUnavailable}>
                    {c.detail.invoiceButton}
                  </Button>
                  <Button variant="secondary" className="h-11 px-4 text-small text-danger-ink" disabled title={c.detail.cancelUnavailable}>
                    {c.detail.cancelButton}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "addresses" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-h3 font-semibold">{c.addresses.heading}</h2>
              <span className="text-small text-gray-800">{c.addresses.countTemplate(addresses?.length ?? 0)}</span>
              <Button className="ms-auto h-11 px-4 text-small" onClick={() => openAddressForm(null)}>
                {c.addresses.addNew}
              </Button>
            </div>

            {addressesLoading && <p className="m-0 text-body text-gray-800">در حال بارگذاری…</p>}
            {addressesLoadError && <p className="m-0 text-body text-danger-ink">دریافت آدرس‌ها ناموفق بود.</p>}
            {addresses && addresses.length === 0 && (
              <p className="m-0 rounded-lg border border-gray-100 bg-white p-4 text-small text-gray-800">
                {c.addresses.empty}
              </p>
            )}

            {addresses && addresses.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={
                      "flex flex-col gap-3 rounded-lg border bg-white p-4 " +
                      (address.isDefault ? "border-2 border-graphite" : "border-gray-100")
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-medium">{address.title}</span>
                      {address.isDefault && (
                        <span className="rounded-full bg-graphite px-2 py-0.5 font-mono text-micro text-fog-white">
                          {c.addresses.defaultBadge}
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-small leading-[1.7] text-gray-800">
                      {address.receiverName} — {address.province}، {address.city}، {address.line}
                    </p>
                    <dl dir="ltr" className="m-0 flex flex-wrap gap-3 font-mono text-micro text-gray-800">
                      <div className="flex gap-2">
                        <dt>POST</dt>
                        <dd className="m-0 text-graphite">{address.postalCode}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt>TEL</dt>
                        <dd className="m-0 text-graphite">{address.receiverPhone}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <Button variant="secondary" className="h-11 px-4 text-small" onClick={() => openAddressForm(address)}>
                        {c.addresses.edit}
                      </Button>
                      {!address.isDefault && (
                        <Button
                          variant="secondary"
                          className="h-11 px-4 text-small"
                          onClick={() => setDefaultMutation.mutate(address.id)}
                          loading={setDefaultMutation.isPending && setDefaultMutation.variables === address.id}
                        >
                          {c.addresses.makeDefault}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        className="h-11 px-4 text-small text-danger-ink"
                        onClick={() => deleteAddressMutation.mutate(address.id)}
                        loading={deleteAddressMutation.isPending && deleteAddressMutation.variables === address.id}
                      >
                        {c.addresses.remove}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddressForm && (
              <form
                noValidate
                onSubmit={addressForm.handleSubmit((values) => saveAddressMutation.mutate(values))}
                className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-4 md:p-12"
              >
                <h3 className="m-0 text-h4 font-semibold">
                  {editingAddress ? c.addresses.form.editHeading : c.addresses.form.addHeading}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input
                    label={c.addresses.form.titleLabel}
                    placeholder={c.addresses.form.titlePlaceholder}
                    error={addressForm.formState.errors.title?.message}
                    {...addressForm.register("title")}
                  />
                  <Input
                    label={c.addresses.form.nameLabel}
                    placeholder={c.addresses.form.namePlaceholder}
                    error={addressForm.formState.errors.receiverName?.message}
                    {...addressForm.register("receiverName")}
                  />
                  <Input
                    label={c.addresses.form.provinceLabel}
                    error={addressForm.formState.errors.province?.message}
                    {...addressForm.register("province")}
                  />
                  <Input
                    label={c.addresses.form.cityLabel}
                    error={addressForm.formState.errors.city?.message}
                    {...addressForm.register("city")}
                  />
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    label={c.addresses.form.postalLabel}
                    placeholder={c.addresses.form.postalPlaceholder}
                    className="font-mono"
                    error={addressForm.formState.errors.postalCode?.message}
                    {...addressForm.register("postalCode")}
                  />
                  <Input
                    dir="ltr"
                    type="tel"
                    inputMode="numeric"
                    label={c.addresses.form.phoneLabel}
                    placeholder={c.addresses.form.phonePlaceholder}
                    className="font-mono"
                    error={addressForm.formState.errors.receiverPhone?.message}
                    {...addressForm.register("receiverPhone")}
                  />
                </div>
                <Textarea
                  rows={3}
                  label={c.addresses.form.lineLabel}
                  placeholder={c.addresses.form.linePlaceholder}
                  error={addressForm.formState.errors.line?.message}
                  {...addressForm.register("line")}
                />
                <Checkbox label={c.addresses.form.defaultLabel} {...addressForm.register("isDefault")} />
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                  <Button type="submit" loading={saveAddressMutation.isPending}>
                    {saveAddressMutation.isPending ? c.addresses.form.saving : c.addresses.form.save}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                    }}
                  >
                    {c.addresses.form.cancel}
                  </Button>
                </div>
                {addressForm.formState.errors.root && (
                  <div className="flex items-center gap-2 rounded-md border border-danger-ink bg-white p-3 text-small text-danger-ink">
                    <span aria-hidden="true">&#10005;</span>
                    {addressForm.formState.errors.root.message}
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {tab === "favorites" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-h3 font-semibold">{fc.account.heading}</h2>
              <span className="text-small text-gray-800">{fc.account.countTemplate(favorites?.length ?? 0)}</span>
            </div>

            {favoritesLoading && <p className="m-0 text-body text-gray-800">{fc.account.loading}</p>}

            {favoritesLoadError && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-100 bg-white p-12">
                <p className="m-0 text-body text-danger-ink">{fc.account.loadError}</p>
                <Button variant="secondary" onClick={() => refetchFavorites()}>
                  {fc.account.retry}
                </Button>
              </div>
            )}

            {!favoritesLoading && !favoritesLoadError && favorites && favorites.length === 0 && (
              <EmptyState
                title={fc.account.empty.heading}
                description={fc.account.empty.body}
                action={
                  <Link
                    to="/products"
                    className="inline-flex h-12 items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline hover:bg-ink"
                  >
                    {fc.account.empty.cta}
                  </Link>
                }
              />
            )}

            {!favoritesLoading && !favoritesLoadError && favorites && favorites.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
                {favorites.map((product) => (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} />
                    <button
                      type="button"
                      onClick={() => removeFavoriteMutation.mutate(product.id)}
                      aria-label={fc.account.removeAriaTemplate(product.name)}
                      className="absolute end-2 top-2 grid size-8 place-items-center rounded-full border border-gray-100 bg-white text-gray-800 hover:border-danger-ink hover:text-danger-ink"
                    >
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div className="flex flex-col gap-4">
            <h2 className="m-0 text-h3 font-semibold">{c.profile.heading}</h2>
            <form
              noValidate
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="flex max-w-text flex-col gap-6 rounded-xl border border-gray-100 bg-white p-4 md:p-12"
            >
              <Input
                label={c.profile.firstNameLabel}
                error={profileForm.formState.errors.fullName?.message}
                {...profileForm.register("fullName")}
              />
              <Input
                dir="ltr"
                type="email"
                label={c.profile.emailLabel}
                error={profileForm.formState.errors.email?.message}
                {...profileForm.register("email")}
              />
              <div className="flex flex-col gap-2">
                <span className="text-small font-medium">{c.profile.phoneLabel}</span>
                <input
                  dir="ltr"
                  type="tel"
                  disabled
                  value={me?.phone ?? ""}
                  className="h-12 w-full cursor-not-allowed rounded-md border border-gray-100 bg-fog-white px-4 font-mono text-body text-silver outline-none"
                />
                <span className="text-caption text-gray-800">{c.profile.phoneHint}</span>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
                <Button type="submit" loading={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? c.profile.saving : c.profile.save}
                </Button>
              </div>
              {profileSaved && <p className="m-0 text-small text-success-ink">{c.profile.saveSuccess}</p>}
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
