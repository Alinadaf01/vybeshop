import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input, Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { OrderRow } from "@/pages/orders/OrderRow";
import { listOrders } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { ORDER_STATUS_LABELS } from "@/types/order";

const PAGE_SIZE = 12;

export default function OrdersPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1", status: "", dateFrom: "", dateTo: "", search: "" });
  const page = Number(filters.page) || 1;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["orders", filters],
    queryFn: () =>
      listOrders({
        page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: filters.search || undefined,
      }),
  });

  const orders = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="سفارش‌ها" description="لیست سفارش‌ها با فیلتر وضعیت و بازه تاریخ، و صفحه جزئیات با اقدامات تغییر وضعیت." />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-48"
            placeholder="جستجوی شماره سفارش…"
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilters({ search: (e.target as HTMLInputElement).value, page: "1" });
            }}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <Select className="w-auto" value={filters.status} onChange={(e) => setFilters({ status: e.target.value, page: "1" })}>
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            از
            <Input
              type="date"
              className="w-auto"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ dateFrom: e.target.value, page: "1" })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            تا
            <Input
              type="date"
              className="w-auto"
              value={filters.dateTo}
              onChange={(e) => setFilters({ dateTo: e.target.value, page: "1" })}
            />
          </label>
        </div>

        {isError ? (
          <ErrorState description="دریافت سفارش‌ها ناموفق بود." onRetry={() => refetch()} />
        ) : !isPending && orders.length === 0 ? (
          <EmptyState title="سفارشی یافت نشد" description="با فیلترهای فعلی سفارشی پیدا نشد." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">شماره سفارش</th>
                    <th className="px-4 py-3 font-medium">مشتری</th>
                    <th className="px-4 py-3 font-medium">تاریخ</th>
                    <th className="px-4 py-3 font-medium">مبلغ</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={5} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {orders.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {data && (
              <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={(p) => setFilters({ page: String(p) })} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
