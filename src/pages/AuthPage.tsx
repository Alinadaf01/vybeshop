import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { Seo } from "@/components/seo/Seo";
import { requestOtp, verifyOtp, updateMe, mergeFavorites } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { loadFavoriteIds, clearFavoriteIds } from "@/lib/favoritesStorage";
import { phoneFormSchema, profileFormSchema, type PhoneFormValues, type ProfileFormValues } from "@/lib/authSchema";
import { authContent as c } from "@/content/auth";

type Step = "phone" | "otp" | "profile" | "done";
const OTP_LENGTH = 6;

function formatPhoneDisplay(phone: string): string {
  return phone.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
}

export default function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: "", rules: false },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: "", email: "" },
  });

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  async function onPhoneSubmit(values: PhoneFormValues) {
    try {
      const result = await requestOtp(values.phone);
      setPhone(values.phone);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(null);
      setSecondsLeft(result.expiresInSeconds);
      setStep("otp");
    } catch (error) {
      phoneForm.setError("phone", { message: error instanceof Error ? error.message : "ارسال کد ناموفق بود." });
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  async function handleResend() {
    try {
      const result = await requestOtp(phone);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(null);
      setSecondsLeft(result.expiresInSeconds);
      otpRefs.current[0]?.focus();
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "ارسال کد ناموفق بود.");
    }
  }

  async function handleOtpSubmit() {
    const code = otpDigits.join("");
    if (code.length < OTP_LENGTH) {
      setOtpError(c.otpStep.incompleteError);
      return;
    }
    setVerifying(true);
    setOtpError(null);
    try {
      const result = await verifyOtp(phone, code);
      auth.login(result);
      setStep(result.isNewUser ? "profile" : "done");

      // Merge on login, same idea as the cart's guest-session merge — fire
      // and forget so a slow/failed merge never blocks the login flow.
      // Local IDs are only cleared once the server confirms the merge, so a
      // failure just means we retry on the next login instead of losing them.
      const localFavoriteIds = loadFavoriteIds();
      if (localFavoriteIds.length > 0) {
        mergeFavorites(localFavoriteIds)
          .then((updated) => {
            queryClient.setQueryData(["favorites"], updated);
            clearFavoriteIds();
          })
          .catch(() => undefined);
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "کد وارد‌شده اشتباه یا منقضی است.");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function onProfileSubmit(values: ProfileFormValues) {
    const [firstName, ...rest] = values.fullName.trim().split(/\s+/);
    try {
      const updated = await updateMe({ firstName, lastName: rest.join(" "), email: values.email || null });
      auth.updateUser(updated);
      setStep("done");
    } catch (error) {
      profileForm.setError("fullName", { message: error instanceof Error ? error.message : "ذخیره اطلاعات ناموفق بود." });
    }
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/auth" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.breadcrumbLabel }]} />

      <section className="grid grid-cols-1 gap-12 pb-14 md:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="order-2 flex w-full max-w-[480px] flex-col gap-6 rounded-xl border border-gray-100 bg-white p-4 md:p-12 lg:order-1">
          {step === "phone" && (
            <form noValidate onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.phoneStep.kicker}
                </span>
                <h1 className="m-0 text-h2 font-semibold">{c.phoneStep.heading}</h1>
                <p className="m-0 text-small leading-[1.7] text-gray-800">{c.phoneStep.subtitle}</p>
              </div>
              <Input
                dir="ltr"
                type="tel"
                inputMode="numeric"
                label={c.phoneStep.phoneLabel}
                placeholder={c.phoneStep.phonePlaceholder}
                className="font-mono"
                error={phoneForm.formState.errors.phone?.message}
                {...phoneForm.register("phone")}
              />
              <Checkbox
                label={c.phoneStep.rulesLabel}
                error={!!phoneForm.formState.errors.rules}
                {...phoneForm.register("rules")}
              />
              <Button type="submit" loading={phoneForm.formState.isSubmitting}>
                {phoneForm.formState.isSubmitting ? c.phoneStep.submitting : c.phoneStep.submit}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.otpStep.kicker}
                </span>
                <h2 className="m-0 text-h2 font-semibold">{c.otpStep.heading}</h2>
                <p className="m-0 text-small leading-[1.7] text-gray-800">
                  {c.otpStep.subtitleBefore}{" "}
                  <span dir="ltr" className="font-mono text-graphite">
                    {formatPhoneDisplay(phone)}
                  </span>{" "}
                  {c.otpStep.subtitleAfter}{" "}
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="border-0 bg-transparent p-0 text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
                  >
                    {c.otpStep.changeNumber}
                  </button>
                </p>
              </div>
              <div dir="ltr" className="flex justify-between gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`رقم ${index + 1}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-14 w-full rounded-md border border-silver bg-white text-center font-mono text-h4 text-graphite outline-none transition-colors duration-fast hover:border-titanium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span dir="ltr" className="font-mono text-small text-gray-800">
                  {secondsLeft > 0 ? `${c.otpStep.resendPrefix} ${minutes}:${seconds}` : ""}
                </span>
                <button
                  type="button"
                  disabled={secondsLeft > 0}
                  onClick={handleResend}
                  className={
                    secondsLeft > 0
                      ? "border-0 bg-transparent p-0 text-small text-silver"
                      : "border-0 bg-transparent p-0 text-small font-medium text-graphite underline decoration-silver underline-offset-4 hover:decoration-graphite"
                  }
                >
                  {c.otpStep.resendAction}
                </button>
              </div>
              <Button onClick={handleOtpSubmit} loading={verifying}>
                {verifying ? c.otpStep.submitting : c.otpStep.submit}
              </Button>
              {otpError && (
                <div className="flex items-center gap-2 rounded-md border border-danger-ink bg-white p-3 text-small text-danger-ink">
                  <span aria-hidden="true">&#10005;</span>
                  {otpError}
                </div>
              )}
            </div>
          )}

          {step === "profile" && (
            <form noValidate onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  {c.profileStep.kicker}
                </span>
                <h2 className="m-0 text-h2 font-semibold">{c.profileStep.heading}</h2>
                <p className="m-0 text-small leading-[1.7] text-gray-800">{c.profileStep.subtitle}</p>
              </div>
              <Input
                label={c.profileStep.nameLabel}
                placeholder={c.profileStep.namePlaceholder}
                error={profileForm.formState.errors.fullName?.message}
                {...profileForm.register("fullName")}
              />
              <div className="flex flex-col gap-2">
                <Input
                  dir="ltr"
                  type="email"
                  label={c.profileStep.emailLabel}
                  placeholder={c.profileStep.emailPlaceholder}
                  error={profileForm.formState.errors.email?.message}
                  {...profileForm.register("email")}
                />
                <span className="text-caption text-gray-800">{c.profileStep.emailHint}</span>
              </div>
              <Button type="submit" loading={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? c.profileStep.submitting : c.profileStep.submit}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full bg-success-ink text-h4 text-white"
              >
                &#10003;
              </span>
              <h2 className="m-0 text-h2 font-semibold">{c.done.heading}</h2>
              <p className="m-0 text-body leading-[1.7] text-gray-800">{c.done.body}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/account")}>{c.done.accountCta}</Button>
                <Button variant="secondary" onClick={() => navigate("/")}>
                  {c.done.homeCta}
                </Button>
              </div>
            </div>
          )}

          <p className="m-0 border-t border-gray-100 pt-6 text-caption leading-[1.7] text-gray-800">
            {c.passwordNote}
          </p>
        </div>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <ImagePlaceholder caption={c.side.imageCaption} className="aspect-[4/3] w-full rounded-xl" />
          <ul className="m-0 flex list-none flex-col p-0">
            {c.side.items.map((item, index) => (
              <li
                key={item}
                className={
                  "flex gap-4 border-t border-gray-100 py-3 text-body text-gray-800" +
                  (index === c.side.items.length - 1 ? " border-b" : "")
                }
              >
                <span aria-hidden="true" className="font-mono text-micro text-titanium">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
