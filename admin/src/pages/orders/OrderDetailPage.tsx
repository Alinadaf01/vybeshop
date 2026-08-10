import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { OrderStatusActions } from "@/pages/orders/OrderStatusActions";
import { getOrder } from "@/lib/api";
import { formatPrice, formatJalaliDateTime } from "@/lib/formatters";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/order";

const STATUS_TONE: Record<OrderStatus, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "brand",
  processing: "brand",
  shipped: "success",
  delivered: "success",
  canceled: "danger",
  returned: "neutral",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = { pending: "در انتظار", success: "موفق", failed: "ناموفق" };

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isPending, isError, refetch } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id!) });

  if (isError) return <ErrorState description="دریافت سفارش ناموفق بود." onRetry={() => refetch()} />;
  if (isPending || !order) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`سفارش #${order.number}`}
        description={`ثبت‌شده در ${formatJalaliDateTime(order.createdAt)}`}
        actions={
          <Chip tone={STATUS_TONE[order.status]} dot>
            {ORDER_STATUS_LABELS[order.status]}
          </Chip>
        }
      />

      <OrderStatusActions order={order} />

      <section className="glass-card overflow-hidden p-0">
        <h2 className="m-0 border-b border-white/[0.06] px-6 py-4 text-sm font-bold text-white">اقلام سفارش</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-start text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                <th className="px-6 py-3 font-medium">محصول</th>
                <th className="px-4 py-3 font-medium">رنگ</th>
                <th className="px-4 py-3 font-medium">قیمت واحد</th>
                <th className="px-4 py-3 font-medium">تعداد</th>
                <th className="px-4 py-3 font-medium">جمع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3">
                    <p className="m-0 font-semibold text-white">{item.productName}</p>
                    <p className="m-0 text-[11px] text-slate-500" dir="ltr">
                      {item.sku}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.colorName || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{formatPrice(item.price)}</td>
                  <td className="px-4 py-3 text-slate-300">{item.quantity.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3 font-bold text-white">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] px-6 py-4 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>جمع جزء</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>تخفیف</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>هزینه ارسال</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>مالیات</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-white/[0.06] pt-2 text-base font-bold text-white">
            <span>مبلغ نهایی</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-card p-6">
          <h2 className="m-0 text-sm font-bold text-white">آدرس تحویل</h2>
          <div className="mt-3 flex flex-col gap-1 text-sm text-slate-300">
            <p className="m-0 font-semibold text-white">{order.shippingAddress?.receiverName}</p>
            <p className="m-0" dir="ltr">
              {order.shippingAddress?.receiverPhone}
            </p>
            <p className="m-0 text-slate-400">
              {order.shippingAddress?.province}، {order.shippingAddress?.city}
            </p>
            <p className="m-0 text-slate-400">{order.shippingAddress?.line}</p>
            <p className="m-0 text-slate-500" dir="ltr">
              {order.shippingAddress?.postalCode}
            </p>
          </div>
          {order.trackingCode && (
            <p className="mt-3 text-xs text-slate-400">
              کد رهگیری: <span dir="ltr" className="font-mono text-brand-300">{order.trackingCode}</span>
            </p>
          )}
          {order.note && <p className="mt-3 text-xs text-slate-400">یادداشت: {order.note}</p>}
        </section>

        <section className="glass-card p-6">
          <h2 className="m-0 text-sm font-bold text-white">پرداخت‌ها</h2>
          {order.payments.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">هنوز پرداختی ثبت نشده.</p>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {order.payments.map((payment) => (
                <li key={payment.id} className="rounded-xl border border-white/[0.06] bg-ink-800/40 px-3.5 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{payment.gateway}</span>
                    <Chip tone={payment.status === "success" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                      {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                    </Chip>
                  </div>
                  <p className="m-0 mt-1 text-slate-400">{formatPrice(payment.amount)}</p>
                  {payment.refId && (
                    <p className="m-0 mt-1 text-[11px] text-slate-500" dir="ltr">
                      {payment.refId}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass-card p-6">
        <h2 className="m-0 text-sm font-bold text-white">تایم‌لاین وضعیت</h2>
        {order.statusLogs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">هنوز تغییر وضعیتی ثبت نشده.</p>
        ) : (
          <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
            {order.statusLogs.map((log, index) => (
              <li key={index} className="relative flex gap-3 ps-5">
                <span className="absolute start-0 top-1.5 size-2 rounded-full bg-brand-400" />
                <div>
                  <p className="m-0 text-sm font-semibold text-white">
                    از «{ORDER_STATUS_LABELS[log.fromStatus as OrderStatus] ?? log.fromStatus}» به «
                    {ORDER_STATUS_LABELS[log.toStatus as OrderStatus] ?? log.toStatus}»
                  </p>
                  <p className="m-0 text-[11px] text-slate-500">
                    {formatJalaliDateTime(log.createdAt)}
                    {log.user && ` · ${log.user}`}
                  </p>
                  {log.note && <p className="m-0 mt-1 text-xs text-slate-400">{log.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
