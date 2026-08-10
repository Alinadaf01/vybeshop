import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SingleImageField } from "@/components/ui/SingleImageField";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { getSiteSettings, updateSiteSettings } from "@/lib/api";
import { siteSettingsFormSchema, type SiteSettingsFormValues } from "@/lib/settingsSchema";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/lib/ToastContext";

type ImageKey = "trustBadgeImage" | "logoLight" | "logoDark" | "favicon" | "defaultOgImage";

export function SiteInfoTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [imageFiles, setImageFiles] = useState<Partial<Record<ImageKey, File>>>({});

  const { data: settings, isPending, isError, refetch } = useQuery({
    queryKey: ["site-settings"],
    queryFn: getSiteSettings,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      phoneDisplay: "", phoneHref: "", email: "", address: "", businessHours: [],
      instagramUrl: "", telegramUrl: "", whatsappUrl: "", linkedinUrl: "", youtubeUrl: "", pinterestUrl: "",
      googleMapsEmbed: "", latitude: null, longitude: null,
      trustBadgeLabel: "", trustBadgeUrl: "", paymentGatewayLabel: "",
      googleAnalyticsId: "", googleTagManagerId: "",
      ownerNotificationPhone: "", notifyOwnerNewOrder: true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "businessHours" });

  useEffect(() => {
    if (!settings) return;
    reset({
      phoneDisplay: settings.phoneDisplay,
      phoneHref: settings.phoneHref,
      email: settings.email,
      address: settings.address,
      businessHours: settings.businessHours,
      instagramUrl: settings.instagramUrl,
      telegramUrl: settings.telegramUrl,
      whatsappUrl: settings.whatsappUrl,
      linkedinUrl: settings.linkedinUrl,
      youtubeUrl: settings.youtubeUrl,
      pinterestUrl: settings.pinterestUrl,
      googleMapsEmbed: settings.googleMapsEmbed,
      latitude: settings.latitude,
      longitude: settings.longitude,
      trustBadgeLabel: settings.trustBadgeLabel,
      trustBadgeUrl: settings.trustBadgeUrl,
      paymentGatewayLabel: settings.paymentGatewayLabel,
      googleAnalyticsId: settings.googleAnalyticsId,
      googleTagManagerId: settings.googleTagManagerId,
      ownerNotificationPhone: settings.ownerNotificationPhone,
      notifyOwnerNewOrder: settings.notifyOwnerNewOrder,
    });
    setImageFiles({});
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: (values: SiteSettingsFormValues) => updateSiteSettings(values, imageFiles),
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(["site-settings"], saved);
      reset(variables);
      setImageFiles({});
      toast.showSuccess("تنظیمات ذخیره شد.");
    },
    onError: (error: unknown) => toast.showError(error instanceof Error ? error.message : "ذخیره ناموفق بود."),
  });

  const hasPendingImages = Object.keys(imageFiles).length > 0;
  const blocker = useUnsavedChangesGuard((isDirty || hasPendingImages) && !isSubmitting);

  if (isError) return <ErrorState description="دریافت تنظیمات ناموفق بود." onRetry={() => refetch()} />;
  if (isPending || !settings) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-6">
      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">تماس</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="شماره نمایشی" htmlFor="s-phone-display" error={errors.phoneDisplay?.message}>
            <Input id="s-phone-display" {...register("phoneDisplay")} />
          </Field>
          <Field label="شماره برای تماس مستقیم" htmlFor="s-phone-href" error={errors.phoneHref?.message} hint="مثال: +982112345678">
            <Input id="s-phone-href" dir="ltr" {...register("phoneHref")} />
          </Field>
          <Field label="ایمیل" htmlFor="s-email" error={errors.email?.message}>
            <Input id="s-email" dir="ltr" {...register("email")} />
          </Field>
          <Field label="آدرس" htmlFor="s-address" error={errors.address?.message}>
            <Input id="s-address" {...register("address")} />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-sm font-bold text-white">ساعات کاری</h2>
          <Button type="button" size="sm" variant="secondary" onClick={() => append({ day: "", time: "" })}>
            + افزودن روز
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">ساعت کاری ثبت نشده.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input placeholder="روز (مثلاً شنبه تا چهارشنبه)" {...register(`businessHours.${index}.day`)} />
                <Input placeholder="ساعت (مثلاً ۹ تا ۱۸)" {...register(`businessHours.${index}.time`)} />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="حذف"
                  className="icon-btn !h-10 !w-10 shrink-0 hover:!text-danger"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">شبکه‌های اجتماعی</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="اینستاگرام" htmlFor="s-instagram" error={errors.instagramUrl?.message}>
            <Input id="s-instagram" dir="ltr" {...register("instagramUrl")} />
          </Field>
          <Field label="تلگرام" htmlFor="s-telegram" error={errors.telegramUrl?.message}>
            <Input id="s-telegram" dir="ltr" {...register("telegramUrl")} />
          </Field>
          <Field label="واتساپ" htmlFor="s-whatsapp" error={errors.whatsappUrl?.message}>
            <Input id="s-whatsapp" dir="ltr" {...register("whatsappUrl")} />
          </Field>
          <Field label="لینکدین" htmlFor="s-linkedin" error={errors.linkedinUrl?.message}>
            <Input id="s-linkedin" dir="ltr" {...register("linkedinUrl")} />
          </Field>
          <Field label="یوتیوب" htmlFor="s-youtube" error={errors.youtubeUrl?.message}>
            <Input id="s-youtube" dir="ltr" {...register("youtubeUrl")} />
          </Field>
          <Field label="پینترست" htmlFor="s-pinterest" error={errors.pinterestUrl?.message}>
            <Input id="s-pinterest" dir="ltr" {...register("pinterestUrl")} />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">نقشه</h2>
        <Field label="کد embed نقشه گوگل" htmlFor="s-map-embed" error={errors.googleMapsEmbed?.message}>
          <Input id="s-map-embed" dir="ltr" {...register("googleMapsEmbed")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عرض جغرافیایی" htmlFor="s-lat" error={errors.latitude?.message}>
            <Input
              id="s-lat"
              type="number"
              step="any"
              dir="ltr"
              value={watch("latitude") ?? ""}
              onChange={(e) => setValue("latitude", e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })}
            />
          </Field>
          <Field label="طول جغرافیایی" htmlFor="s-lng" error={errors.longitude?.message}>
            <Input
              id="s-lng"
              type="number"
              step="any"
              dir="ltr"
              value={watch("longitude") ?? ""}
              onChange={(e) => setValue("longitude", e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })}
            />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">نماد اعتماد و درگاه پرداخت</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="متن نماد اعتماد" htmlFor="s-trust-label" error={errors.trustBadgeLabel?.message}>
            <Input id="s-trust-label" {...register("trustBadgeLabel")} />
          </Field>
          <Field label="لینک نماد اعتماد" htmlFor="s-trust-url" error={errors.trustBadgeUrl?.message}>
            <Input id="s-trust-url" dir="ltr" {...register("trustBadgeUrl")} />
          </Field>
          <Field label="متن نمایش درگاه پرداخت" htmlFor="s-gateway-label" error={errors.paymentGatewayLabel?.message}>
            <Input id="s-gateway-label" {...register("paymentGatewayLabel")} />
          </Field>
        </div>
        <SingleImageField
          label="تصویر نماد اعتماد"
          currentUrl={settings.trustBadgeImage}
          onFileSelected={(file) => setImageFiles((prev) => ({ ...prev, trustBadgeImage: file }))}
        />
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">لوگو و آیکون</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SingleImageField
            label="لوگو روشن"
            currentUrl={settings.logoLight}
            onFileSelected={(file) => setImageFiles((prev) => ({ ...prev, logoLight: file }))}
          />
          <SingleImageField
            label="لوگو تیره"
            currentUrl={settings.logoDark}
            onFileSelected={(file) => setImageFiles((prev) => ({ ...prev, logoDark: file }))}
          />
          <SingleImageField
            label="فاوآیکون"
            currentUrl={settings.favicon}
            onFileSelected={(file) => setImageFiles((prev) => ({ ...prev, favicon: file }))}
          />
          <SingleImageField
            label="تصویر پیش‌فرض OG"
            currentUrl={settings.defaultOgImage}
            onFileSelected={(file) => setImageFiles((prev) => ({ ...prev, defaultOgImage: file }))}
          />
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">تحلیل</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Google Analytics ID" htmlFor="s-ga" error={errors.googleAnalyticsId?.message}>
            <Input id="s-ga" dir="ltr" {...register("googleAnalyticsId")} />
          </Field>
          <Field label="Google Tag Manager ID" htmlFor="s-gtm" error={errors.googleTagManagerId?.message}>
            <Input id="s-gtm" dir="ltr" {...register("googleTagManagerId")} />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">اعلان کارفرما</h2>
        <Field
          label="شماره‌های اعلان (با کاما جدا شود)"
          htmlFor="s-owner-phone"
          error={errors.ownerNotificationPhone?.message}
          hint="مثال: 09120000000,09121111111"
        >
          <Input id="s-owner-phone" dir="ltr" {...register("ownerNotificationPhone")} />
        </Field>
        <Switch
          checked={watch("notifyOwnerNewOrder")}
          onChange={(v) => setValue("notifyOwnerNewOrder", v, { shouldDirty: true })}
          label="پیامک هنگام پرداخت موفق سفارش جدید"
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || (!isDirty && !hasPendingImages)}>
          {isSubmitting ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </Button>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="تغییرات ذخیره‌نشده"
        description="اگر خارج شوید، تغییرات این بخش ذخیره نخواهد شد."
        confirmLabel="خروج بدون ذخیره"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </form>
  );
}
