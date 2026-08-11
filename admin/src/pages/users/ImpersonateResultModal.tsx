import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/ToastContext";

export function ImpersonateResultModal({
  tokens,
  userPhone,
  onClose,
}: {
  tokens: { access: string; refresh: string } | null;
  userPhone: string;
  onClose: () => void;
}) {
  const toast = useToast();

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.showSuccess(`${label} کپی شد.`);
  }

  return (
    <Modal open={!!tokens} onClose={onClose} title={`نشست موقت برای ${userPhone}`} widthClass="max-w-xl">
      <div className="flex flex-col gap-4">
        <p className="m-0 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          این عملیات در گزارش فعالیت ثبت شد. توکن‌های زیر مخصوص فروشگاه (سایت مشتری) هستند، نه پنل ادمین — باید در حافظه محلی فروشگاه جای‌گذاری شوند تا نشست فعال شود.
        </p>
        {tokens && (
          <>
            <div>
              <p className="m-0 mb-1 text-xs text-slate-500">access token</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2">
                <code className="flex-1 truncate font-mono text-xs text-white" dir="ltr">
                  {tokens.access}
                </code>
                <Button type="button" size="sm" variant="secondary" onClick={() => copy(tokens.access, "Access token")}>
                  کپی
                </Button>
              </div>
            </div>
            <div>
              <p className="m-0 mb-1 text-xs text-slate-500">refresh token</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2">
                <code className="flex-1 truncate font-mono text-xs text-white" dir="ltr">
                  {tokens.refresh}
                </code>
                <Button type="button" size="sm" variant="secondary" onClick={() => copy(tokens.refresh, "Refresh token")}>
                  کپی
                </Button>
              </div>
            </div>
          </>
        )}
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </Modal>
  );
}
