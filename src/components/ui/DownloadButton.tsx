import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";

export type DownloadStatus = "idle" | "preparing" | "done" | "error";

export interface DownloadButtonProps {
  status: DownloadStatus;
  href: string;
  fileName: string;
  label?: string;
  meta?: ReactNode;
  onRetry?: () => void;
  onDownloadStart?: () => void;
}

export function DownloadButton({
  status,
  href,
  fileName,
  label = "دانلود کاتالوگ (PDF)",
  meta,
  onRetry,
  onDownloadStart,
}: DownloadButtonProps) {
  if (status === "preparing") {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled
          className="flex h-14 cursor-progress items-center justify-center gap-2 rounded-md border-0 bg-silver px-6 text-body font-medium text-graphite"
        >
          <Spinner className="border-titanium border-t-graphite" />
          در حال آماده‌سازی
        </button>
        {meta}
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-3">
        <a
          href={href}
          download={fileName}
          className="grid h-14 place-items-center rounded-md border border-success bg-transparent px-6 text-body font-medium text-success no-underline"
        >
          دانلود شد
        </a>
        {meta}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="h-14 rounded-md border border-danger bg-transparent px-6 text-body font-medium text-danger-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          دانلود ناموفق — تلاش دوباره
        </button>
        {meta}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={href}
        download={fileName}
        onClick={onDownloadStart}
        className="grid h-14 place-items-center rounded-md border-0 bg-white px-6 text-body font-medium text-graphite no-underline hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      >
        {label}
      </a>
      {meta}
    </div>
  );
}
