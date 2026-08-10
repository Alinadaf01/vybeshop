import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createUser, ApiFieldError } from "@/lib/api";
import { createUserFormSchema, type CreateUserFormSchemaValues } from "@/lib/userSchema";
import { useToast } from "@/lib/ToastContext";

export function UserFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormSchemaValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { phone: "", firstName: "", lastName: "", email: "", isVerified: true },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateUserFormSchemaValues) => createUser(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.showSuccess("کاربر ایجاد شد.");
      reset();
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiFieldError && error.field !== "detail") {
        setError(error.field as keyof CreateUserFormSchemaValues, { message: error.message });
      } else {
        toast.showError(error instanceof Error ? error.message : "ایجاد کاربر ناموفق بود.");
      }
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="کاربر جدید">
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
        <Field label="شماره موبایل" htmlFor="user-phone" required error={errors.phone?.message}>
          <Input id="user-phone" dir="ltr" {...register("phone")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نام" htmlFor="user-first" error={errors.firstName?.message}>
            <Input id="user-first" {...register("firstName")} />
          </Field>
          <Field label="نام خانوادگی" htmlFor="user-last" error={errors.lastName?.message}>
            <Input id="user-last" {...register("lastName")} />
          </Field>
        </div>
        <Field label="ایمیل" htmlFor="user-email" error={errors.email?.message}>
          <Input id="user-email" dir="ltr" {...register("email")} />
        </Field>
        <Switch
          checked={watch("isVerified")}
          onChange={(v) => setValue("isVerified", v, { shouldDirty: true })}
          label="تأیید‌شده (بدون نیاز به کد ورود)"
        />
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ذخیره…" : "ایجاد"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
