import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Field";
import { markOrderPaid, startOrderProcessing, markOrderShipped, markOrderDelivered, cancelOrder } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { AdminOrder } from "@/types/order";

export function OrderStatusActions({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [trackingCode, setTrackingCode] = useState(order.trackingCode);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  function useAction(fn: () => Promise<AdminOrder>, successMessage: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        invalidate();
        toast.showSuccess(successMessage);
      },
      onError: (error: unknown) => toast.showError(error instanceof Error ? error.message : "عملیات ناموفق بود."),
    });
  }

  const payMutation = useAction(() => markOrderPaid(order.id), "پرداخت سفارش ثبت شد.");
  const processMutation = useAction(() => startOrderProcessing(order.id), "پردازش سفارش آغاز شد.");
  const shipMutation = useAction(() => markOrderShipped(order.id, trackingCode), "ارسال سفارش ثبت شد.");
  const deliverMutation = useAction(() => markOrderDelivered(order.id), "تحویل سفارش ثبت شد.");
  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(order.id, cancelReason),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("سفارش لغو شد.");
      setCancelOpen(false);
      setCancelReason("");
    },
    onError: (error: unknown) => toast.showError(error instanceof Error ? error.message : "لغو سفارش ناموفق بود."),
  });

  const canCancel = ["pending", "paid", "processing"].includes(order.status);

  return (
    <section className="glass-card flex flex-wrap items-center gap-3 p-5">
      {order.status === "pending" && (
        <Button size="sm" disabled={payMutation.isPending} onClick={() => payMutation.mutate()}>
          {payMutation.isPending ? "در حال ثبت…" : "ثبت پرداخت"}
        </Button>
      )}
      {order.status === "paid" && (
        <Button size="sm" disabled={processMutation.isPending} onClick={() => processMutation.mutate()}>
          {processMutation.isPending ? "در حال ثبت…" : "شروع پردازش"}
        </Button>
      )}
      {order.status === "processing" && (
        <div className="flex items-center gap-2">
          <Input
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="کد رهگیری پستی"
            dir="ltr"
            className="w-48"
          />
          <Button size="sm" disabled={!trackingCode.trim() || shipMutation.isPending} onClick={() => shipMutation.mutate()}>
            {shipMutation.isPending ? "در حال ثبت…" : "ثبت ارسال"}
          </Button>
        </div>
      )}
      {order.status === "shipped" && (
        <Button size="sm" disabled={deliverMutation.isPending} onClick={() => deliverMutation.mutate()}>
          {deliverMutation.isPending ? "در حال ثبت…" : "تحویل داده شد"}
        </Button>
      )}
      {canCancel && (
        <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
          لغو سفارش
        </Button>
      )}
      {!canCancel && order.status !== "shipped" && order.status !== "pending" && order.status !== "paid" && order.status !== "processing" && (
        <p className="m-0 text-xs text-slate-500">این سفارش در وضعیت نهایی است.</p>
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="لغو سفارش" widthClass="max-w-sm">
        <div className="flex flex-col gap-4">
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="دلیل لغو (اختیاری)"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
              انصراف
            </Button>
            <Button type="button" variant="danger" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? "در حال لغو…" : "لغو سفارش"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
