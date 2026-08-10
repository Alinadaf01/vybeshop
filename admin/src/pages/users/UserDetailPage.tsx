import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { getUser, updateUser } from "@/lib/api";
import { updateUserFormSchema, type UpdateUserFormSchemaValues } from "@/lib/userSchema";
import { useToast } from "@/lib/ToastContext";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user, isPending, isError, refetch } = useQuery({ queryKey: ["user", id], queryFn: () => getUser(id!) });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateUserFormSchemaValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", isVerified: false, isActive: true, isStaff: false },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email ?? "",
      isVerified: user.isVerified,
      isActive: user.isActive,
      isStaff: user.isStaff,
    });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: UpdateUserFormSchemaValues) => updateUser(id!, values),
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(["user", id], saved);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset(variables);
      toast.showSuccess("کاربر ذخیره شد.");
    },
    onError: (error: unknown) => toast.showError(error instanceof Error ? error.message : "ذخیره ناموفق بود."),
  });

  if (isError) return <ErrorState description="دریافت کاربر ناموفق بود." onRetry={() => refetch()} />;
  if (isPending || !user) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`.trim() || user.phone}
        description={`شماره تماس: ${user.phone} · ${user.orderCount.toLocaleString("fa-IR")} سفارش`}
      />

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">پروفایل</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="نام" htmlFor="u-first" error={errors.firstName?.message}>
            <Input id="u-first" {...register("firstName")} />
          </Field>
          <Field label="نام خانوادگی" htmlFor="u-last" error={errors.lastName?.message}>
            <Input id="u-last" {...register("lastName")} />
          </Field>
        </div>
        <Field label="ایمیل" htmlFor="u-email" error={errors.email?.message}>
          <Input id="u-email" dir="ltr" {...register("email")} />
        </Field>
        <div className="flex flex-wrap items-center gap-6">
          <Switch checked={watch("isVerified")} onChange={(v) => setValue("isVerified", v, { shouldDirty: true })} label="تأیید‌شده" />
          <Switch checked={watch("isActive")} onChange={(v) => setValue("isActive", v, { shouldDirty: true })} label="فعال" />
          <Switch checked={watch("isStaff")} onChange={(v) => setValue("isStaff", v, { shouldDirty: true })} label="دسترسی ادمین" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </form>

      <section className="glass-card p-6">
        <h2 className="m-0 text-sm font-bold text-white">آدرس‌ها</h2>
        {user.addresses.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">آدرسی ثبت نشده.</p>
        ) : (
          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {user.addresses.map((address) => (
              <li key={address.id} className="rounded-xl border border-white/[0.06] bg-ink-800/40 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{address.title}</span>
                  {address.isDefault && <Chip tone="brand">پیش‌فرض</Chip>}
                </div>
                <p className="m-0 mt-1 text-slate-400">
                  {address.province}، {address.city} — {address.line}
                </p>
                <p className="m-0 mt-1 text-[11px] text-slate-500" dir="ltr">
                  {address.receiverName} · {address.receiverPhone} · {address.postalCode}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
