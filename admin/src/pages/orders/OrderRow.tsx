import { useNavigate } from "react-router-dom";
import { Chip } from "@/components/ui/Chip";
import { formatPrice, formatJalaliDate } from "@/lib/formatters";
import { ORDER_STATUS_LABELS, type AdminOrder, type OrderStatus } from "@/types/order";

const STATUS_TONE: Record<OrderStatus, "brand" | "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "brand",
  processing: "brand",
  shipped: "success",
  delivered: "success",
  canceled: "danger",
  returned: "neutral",
};

export function OrderRow({ order }: { order: AdminOrder }) {
  const navigate = useNavigate();
  return (
    <tr className="cursor-pointer transition-colors hover:bg-white/[0.02]" onClick={() => navigate(`/orders/${order.id}`)}>
      <td className="px-6 py-3 font-mono text-xs text-brand-300" dir="ltr">
        #{order.number}
      </td>
      <td className="px-4 py-3">
        <p className="m-0 font-semibold text-white">{order.shippingAddress?.receiverName || "—"}</p>
        <p className="m-0 text-[11px] text-slate-500">{order.shippingAddress?.city}</p>
      </td>
      <td className="px-4 py-3 text-slate-400">{formatJalaliDate(order.createdAt)}</td>
      <td className="px-4 py-3 font-bold text-white">{formatPrice(order.total)}</td>
      <td className="px-4 py-3">
        <Chip tone={STATUS_TONE[order.status]} dot>
          {ORDER_STATUS_LABELS[order.status]}
        </Chip>
      </td>
    </tr>
  );
}
