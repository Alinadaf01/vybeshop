import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { submitContactMessage, getSiteSettings } from "@/lib/api";
import { contactFormSchema, type ContactFormValues } from "@/lib/contactSchema";
import { Seo } from "@/components/seo/Seo";
import { contactContent as c } from "@/content/contact";

type SubmitState = { status: "idle" | "success" | "error"; trackingId?: string };

export default function ContactPage() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", newsletter: false },
  });

  async function onSubmit(values: ContactFormValues) {
    try {
      const result = await submitContactMessage({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
        newsletter: values.newsletter,
      });
      setSubmitState({ status: "success", trackingId: result.id });
      reset();
    } catch {
      setSubmitState({ status: "error" });
    }
  }

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/contact" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.heading }]} />

      <div className="flex flex-col gap-3 pb-12">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        <p className="m-0 max-w-text text-body-large text-gray-800 [text-wrap:pretty]">{c.subtitle}</p>
      </div>

      <section className="grid grid-cols-1 gap-12 pb-14 md:pb-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        {submitState.status === "success" ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-success-ink bg-white p-6 md:p-12">
            <span className="flex items-center gap-2 text-body font-medium text-success-ink">
              <span aria-hidden="true">&#10003;</span>
              {c.form.success.title}
            </span>
            <p className="m-0 text-small leading-[1.7] text-gray-800">
              {c.form.success.trackingTemplate(submitState.trackingId ?? "")}
            </p>
            <Button variant="secondary" onClick={() => setSubmitState({ status: "idle" })}>
              {c.form.success.again}
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-4 md:p-12"
          >
            <div className="flex flex-col gap-2">
              <h2 className="m-0 text-h3 font-semibold">{c.form.heading}</h2>
              <p className="m-0 text-small text-gray-800">{c.form.requiredNote}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label={c.form.fields.name.label}
                placeholder={c.form.fields.name.placeholder}
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                type="email"
                label={c.form.fields.email.label}
                placeholder={c.form.fields.email.placeholder}
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <Select label={c.form.fields.subject.label} error={errors.subject?.message} {...register("subject")}>
              <option value="">{c.form.fields.subject.placeholder}</option>
              {c.form.subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>

            <Textarea
              rows={6}
              label={c.form.fields.message.label}
              placeholder={c.form.fields.message.placeholder}
              error={errors.message?.message}
              {...register("message")}
            />

            <Checkbox label={c.form.newsletterLabel} {...register("newsletter")} />

            <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-6">
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? c.form.submitting : c.form.submit}
              </Button>
              <span className="text-small text-gray-800">{c.form.submitNote}</span>
            </div>

            {submitState.status === "error" && (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-ink bg-white p-4">
                <span className="flex items-center gap-2 text-body font-medium text-danger-ink">
                  <span aria-hidden="true">&#10005;</span>
                  {c.form.error.title}
                </span>
                <p className="m-0 text-small leading-[1.7] text-gray-800">{c.form.error.description}</p>
                <Button type="submit" variant="secondary">
                  {c.form.error.retry}
                </Button>
              </div>
            )}
          </form>
        )}

        <aside className="flex flex-col gap-4">
          {settings && (
            <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.info.addressLabel}
                </span>
                <p className="m-0 text-body leading-[1.7] text-graphite">{settings.address}</p>
              </div>
              <div className="flex flex-col gap-1 border-b border-gray-100 py-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.info.emailLabel}
                </span>
                <a
                  href={`mailto:${settings.email}`}
                  dir="ltr"
                  className="font-mono text-body text-graphite underline decoration-silver underline-offset-4 hover:decoration-graphite"
                >
                  {settings.email}
                </a>
              </div>
              <div className="flex flex-col gap-1 border-b border-gray-100 py-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.info.phoneLabel}
                </span>
                <a
                  href={`tel:${settings.phone.href}`}
                  dir="ltr"
                  className="font-mono text-body text-graphite underline decoration-silver underline-offset-4 hover:decoration-graphite"
                >
                  {settings.phone.display}
                </a>
              </div>
              <div className="flex flex-col gap-2 border-b border-gray-100 py-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.info.hoursLabel}
                </span>
                {settings.businessHours.map((row) => (
                  <div key={row.day} className="flex justify-between gap-3 text-small">
                    <span className="text-gray-800">{row.day}</span>
                    <span dir="ltr" className="font-mono">
                      {row.time}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.info.socialLabel}
                </span>
                <div dir="ltr" className="flex flex-wrap gap-2">
                  {settings.socialLinks.map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      className="rounded-sm border border-silver px-2 py-1 font-mono text-micro text-gray-800 no-underline transition-colors duration-fast hover:border-titanium"
                    >
                      {link.platform}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <ImagePlaceholder caption={c.map.caption} className="aspect-[4/3] w-full rounded-xl" />
            <a
              href="#"
              className="self-start text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
            >
              {c.map.directionsLink}
            </a>
          </div>
        </aside>
      </section>

      <section className="flex flex-col gap-6 border-t border-gray-100 py-14 md:py-20">
        <div className="flex flex-col gap-2">
          <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-gray-800">
            {c.faq.kicker}
          </p>
          <h2 className="m-0 text-h2 font-semibold">{c.faq.heading}</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {c.faq.items.map((item, index) => (
            <details
              key={item.question}
              className={
                "group bg-white px-4 py-3" + (index < c.faq.items.length - 1 ? " border-b border-gray-100" : "")
              }
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium text-graphite marker:content-none">
                {item.question}
                <span aria-hidden="true" className="font-mono text-h4 text-titanium transition-colors duration-fast group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="hidden font-mono text-h4 text-titanium group-open:block">
                  &minus;
                </span>
              </summary>
              <p className="m-0 mt-3 max-w-text text-body leading-[1.7] text-gray-800 [text-wrap:pretty]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
