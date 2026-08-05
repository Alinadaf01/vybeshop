import { cn } from "@/lib/cn";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageList(page: number, pageCount: number): (number | "ellipsis")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) result.push("ellipsis");
    result.push(p);
    previous = p;
  }
  return result;
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = getPageList(page, pageCount);

  const cellBase =
    "grid h-10 w-10 place-items-center rounded-md border font-mono text-small no-underline transition-colors duration-fast";

  return (
    <nav aria-label="صفحه‌بندی" className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label="صفحه قبلی"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(
          cellBase,
          "border-gray-100 text-caption",
          page <= 1 ? "cursor-not-allowed text-silver" : "text-graphite hover:border-graphite",
        )}
      >
        &rsaquo;
      </button>

      {pages.map((p, index) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="grid size-10 place-items-center text-gray-800">
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`صفحه ${p}`}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              cellBase,
              p === page
                ? "border-graphite bg-graphite text-fog-white"
                : "border-gray-100 text-graphite hover:border-graphite",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="صفحه بعدی"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={cn(
          cellBase,
          "border-gray-100 text-caption",
          page >= pageCount ? "cursor-not-allowed text-silver" : "text-graphite hover:border-graphite",
        )}
      >
        &lsaquo;
      </button>
    </nav>
  );
}
