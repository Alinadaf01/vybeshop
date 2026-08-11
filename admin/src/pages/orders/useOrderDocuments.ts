import { useState } from "react";
import { downloadOrderInvoice, downloadOrderPackingSlip } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { AdminOrder } from "@/types/order";

/** §۴ — همان دو سند PDF که مشتری/بسته‌بندی می‌گیرند، فقط دسترسی سریع از پنل.
 * فقط برای سفارش‌هایی که واقعاً پرداخت شده‌اند در دسترس است — paidAt، نه
 * status فعلی، چون سفارش پرداخت‌شده ممکن است بعداً لغو/مرجوع شده باشد ولی
 * فاکتورش هنوز معتبر است. */
export function useOrderDocuments(order: Pick<AdminOrder, "id" | "number" | "paidAt">) {
  const toast = useToast();
  const [downloading, setDownloading] = useState<"invoice" | "packing-slip" | null>(null);

  const canDownload = Boolean(order.paidAt);

  async function run(kind: "invoice" | "packing-slip", action: () => Promise<void>) {
    setDownloading(kind);
    try {
      await action();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : "دانلود فایل ناموفق بود.");
    } finally {
      setDownloading(null);
    }
  }

  return {
    canDownload,
    isDownloadingInvoice: downloading === "invoice",
    isDownloadingPackingSlip: downloading === "packing-slip",
    downloadInvoice: () => run("invoice", () => downloadOrderInvoice(order.id, order.number)),
    downloadPackingSlip: () => run("packing-slip", () => downloadOrderPackingSlip(order.id, order.number)),
  };
}
