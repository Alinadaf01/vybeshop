import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { MoreVertical, FileText, Package } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { formatPrice, formatJalaliDate } from "@/lib/formatters";
import { useOrderDocuments } from "@/pages/orders/useOrderDocuments";
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const documents = useOrderDocuments(order);

  // Rendered via a portal (below) instead of an absolutely-positioned child —
  // the row lives inside the table's overflow-x-auto wrapper, which clips
  // any absolutely-positioned descendant that would otherwise overflow it,
  // cutting the dropdown off at the table's edge.
  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 192;
    // Prefer aligning the menu's right edge to the button (opens toward the
    // page's left, the usual direction) — but this column sits at the far
    // left of a wide, horizontally-scrollable table, so that can push the
    // menu past the viewport edge. Flip to aligning the left edges instead
    // (menu opens rightward, back over the table) when that would happen.
    const rightAligned = rect.right - menuWidth;
    const left = rightAligned < 8 ? rect.left : rightAligned;
    setMenuPos({ top: rect.bottom + 4, left });
  }

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
      <td className="w-10 px-2 py-3 text-end" onClick={(event) => event.stopPropagation()}>
        {documents.canDownload && (
          <>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => (menuPos ? setMenuPos(null) : openMenu())}
              aria-haspopup="true"
              aria-expanded={!!menuPos}
              aria-label="عملیات سفارش"
              className="icon-btn"
            >
              <MoreVertical className="size-4" strokeWidth={1.8} />
            </button>
            {menuPos &&
              createPortal(
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuPos(null)} aria-hidden="true" />
                  <div
                    className="glass-card fixed z-50 w-48 overflow-hidden !bg-ink-850/95 p-2"
                    style={{ top: menuPos.top, left: menuPos.left }}
                  >
                    <button
                      type="button"
                      disabled={documents.isDownloadingInvoice}
                      onClick={() => {
                        setMenuPos(null);
                        documents.downloadInvoice();
                      }}
                      className="profile-menu-item w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileText className="size-4 shrink-0" strokeWidth={1.8} />
                      فاکتور
                    </button>
                    <button
                      type="button"
                      disabled={documents.isDownloadingPackingSlip}
                      onClick={() => {
                        setMenuPos(null);
                        documents.downloadPackingSlip();
                      }}
                      className="profile-menu-item w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Package className="size-4 shrink-0" strokeWidth={1.8} />
                      برگه بسته‌بندی
                    </button>
                  </div>
                </>,
                document.body,
              )}
          </>
        )}
      </td>
    </tr>
  );
}
