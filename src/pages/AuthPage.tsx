import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Seo } from "@/components/seo/Seo";
import { requestOtp, verifyOtp, updateMe, mergeFavorites } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { loadFavoriteIds, clearFavoriteIds } from "@/lib/favoritesStorage";
import { phoneFormSchema, profileFormSchema, type PhoneFormValues, type ProfileFormValues } from "@/lib/authSchema";
import { authContent as c } from "@/content/auth";

type Step = "phone" | "otp" | "profile" | "done";
const OTP_LENGTH = 6;

// دو استایل مشترک برای فیلدهای متنی/چک‌باکس روی کارت تیره — Input/Checkbox
// مشترک سایت برای زمینه روشن ساخته شده‌اند، برای همین اینجا (تنها جایی که
// کارت تیره دارد) نسخه محلی می‌سازیم به‌جای دستکاری آن کامپوننت‌های مشترک.
const darkFieldClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-body text-fog-white outline-none transition-all duration-base placeholder:text-titanium hover:border-white/20 focus-visible:border-cyan/60 focus-visible:bg-cyan/[0.06] focus-visible:shadow-[0_0_0_3px_rgba(0,209,255,0.18)]";

function formatPhoneDisplay(phone: string): string {
  return phone.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
}

/** آیکون قفل با حلقه پالس سیان — سرصفحه مشترک مراحل شماره/کد/پروفایل. */
function LoginIcon() {
  return (
    <div className="mb-6 flex justify-center">
      <div className="rounded-2xl border-cyan/25 bg-cyan/[0.07] flex size-14 items-center justify-center border motion-safe:animate-pulse-ring motion-reduce:animate-none">
        <svg className="size-7 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
    </div>
  );
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
  const [shake, setShake] = useState(false);
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

  // FIX-TASK.md §2 — «لرزش کارت هنگام کد اشتباه»، بدون دست‌زدن به منطق تأیید.
  useEffect(() => {
    if (!otpError) return;
    setShake(true);
    const timeout = setTimeout(() => setShake(false), 550);
    return () => clearTimeout(timeout);
  }, [otpError]);

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
    // ناوبری کیبورد بین خانه‌ها (FIX-TASK.md §2) — ردیف dir="ltr" است، پس
    // معنای چپ/راست هم بر همان مبنا (استاندارد LTR) می‌ماند.
    else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
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
  const isSuccess = step === "done";

  return (
    <div
      className={cn(
        "relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-14 transition-colors duration-slow sm:py-20",
        isSuccess ? "bg-[#03110a]" : "bg-graphite",
      )}
    >
      <Seo title={c.seo.title} description={c.seo.description} path="/auth" />

      {/* پس‌زمینه مش متحرک + گویچه‌های محو — سهم سیان طبق برند‌بوک زیر ۱٪ و
      فقط در این گرادیان‌های بسیار رقیق، هرگز پس‌زمینه یکدست. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 motion-safe:animate-mesh-shift motion-reduce:animate-none",
            isSuccess
              ? "bg-[radial-gradient(ellipse_90%_70%_at_15%_20%,rgba(47,182,107,0.16),transparent_55%),radial-gradient(ellipse_70%_55%_at_85%_75%,rgba(47,182,107,0.1),transparent_50%)]"
              : "bg-[radial-gradient(ellipse_90%_70%_at_15%_20%,rgba(0,209,255,0.10),transparent_55%),radial-gradient(ellipse_70%_55%_at_85%_75%,rgba(0,209,255,0.06),transparent_50%)]",
          )}
        />
        <div
          className={cn(
            "absolute end-0 top-[5%] size-[300px] rounded-full opacity-40 blur-[70px] motion-safe:animate-orb-float-1 motion-reduce:animate-none",
            isSuccess ? "bg-success/25" : "bg-cyan/20",
          )}
        />
        <div
          className={cn(
            "absolute bottom-[10%] start-[5%] size-[240px] rounded-full opacity-30 blur-[70px] motion-safe:animate-orb-float-2 motion-reduce:animate-none",
            isSuccess ? "bg-success/20" : "bg-cyan/15",
          )}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,209,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,209,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border p-6 shadow-2xl backdrop-blur-xl motion-safe:animate-card-enter motion-reduce:animate-none sm:p-8",
          isSuccess ? "border-success/40 bg-[#06180e]/92" : "border-white/10 bg-black/40",
          shake && "motion-safe:animate-shake",
        )}
      >
        {step === "phone" && (
          <form noValidate onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="flex flex-col gap-6">
            <LoginIcon />
            <div className="flex flex-col items-center gap-2 text-center">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
                {c.phoneStep.kicker}
              </span>
              <h1 className="m-0 text-h2 font-semibold text-fog-white">{c.phoneStep.heading}</h1>
              <p className="m-0 text-small leading-[1.7] text-silver">{c.phoneStep.subtitle}</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-phone" className="text-small font-medium text-fog-white">
                {c.phoneStep.phoneLabel}
              </label>
              <input
                id="auth-phone"
                dir="ltr"
                type="tel"
                inputMode="numeric"
                placeholder={c.phoneStep.phonePlaceholder}
                className={cn(darkFieldClass, "font-mono", phoneForm.formState.errors.phone && "border-danger")}
                aria-invalid={!!phoneForm.formState.errors.phone}
                {...phoneForm.register("phone")}
              />
              {phoneForm.formState.errors.phone && (
                <span className="text-caption text-danger-dark" role="alert" aria-live="polite">
                  {phoneForm.formState.errors.phone.message}
                </span>
              )}
            </div>
            <label className="inline-flex cursor-pointer select-none items-start gap-2.5">
              <span className="relative mt-0.5 inline-flex size-5 shrink-0">
                <input
                  type="checkbox"
                  className="peer absolute inset-0 z-10 size-5 cursor-pointer opacity-0"
                  {...phoneForm.register("rules")}
                />
                <span
                  className={cn(
                    "bg-white/[0.04] peer-checked:bg-cyan/20 pointer-events-none absolute inset-0 rounded-sm border transition-colors duration-fast peer-checked:border-cyan peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan",
                    phoneForm.formState.errors.rules ? "border-danger" : "border-white/20",
                  )}
                />
                <svg viewBox="0 0 12 12" fill="none" className="pointer-events-none absolute inset-0 size-5 p-1 opacity-0 peer-checked:opacity-100">
                  <path d="M2 6.2 4.8 9 10 3" stroke="#00D1FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-body text-silver">{c.phoneStep.rulesLabel}</span>
            </label>
            <Button
              type="submit"
              loading={phoneForm.formState.isSubmitting}
              className="h-12 w-full !bg-white !text-graphite hover:!bg-gray-100"
            >
              {phoneForm.formState.isSubmitting ? c.phoneStep.submitting : c.phoneStep.submit}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <div className="flex flex-col gap-6">
            <LoginIcon />
            <div className="flex flex-col items-center gap-2 text-center">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
                {c.otpStep.kicker}
              </span>
              <h2 className="m-0 text-h2 font-semibold text-fog-white">{c.otpStep.heading}</h2>
              <p className="m-0 text-small leading-[1.7] text-silver">
                {c.otpStep.subtitleBefore}{" "}
                <span dir="ltr" className="font-mono text-fog-white">
                  {formatPhoneDisplay(phone)}
                </span>{" "}
                {c.otpStep.subtitleAfter}
              </p>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="decoration-cyan/40 border-0 bg-transparent p-0 text-small text-cyan underline underline-offset-4 hover:decoration-cyan"
              >
                {c.otpStep.changeNumber}
              </button>
            </div>
            <div dir="ltr" role="group" aria-label="ارقام کد تایید" className="flex justify-between gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`رقم ${index + 1}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  className={cn(
                    "h-14 w-full rounded-xl border-2 text-center font-mono text-h4 outline-none transition-all duration-fast",
                    otpError
                      ? "bg-danger/10 border-danger text-danger-dark"
                      : digit
                        ? "border-cyan/70 bg-cyan/10 text-fog-white"
                        : "border-white/15 bg-white/[0.04] text-fog-white",
                    "focus-visible:scale-[1.03] focus-visible:border-cyan focus-visible:shadow-[0_0_0_3px_rgba(0,209,255,0.25)]",
                  )}
                />
              ))}
            </div>
            {otpError && (
              <p className="m-0 text-center text-small text-danger-dark" role="alert" aria-live="polite">
                {otpError}
              </p>
            )}
            <Button
              onClick={handleOtpSubmit}
              loading={verifying}
              className="h-12 w-full !bg-white !text-graphite hover:!bg-gray-100"
            >
              {verifying ? c.otpStep.submitting : c.otpStep.submit}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
              <span dir="ltr" className="font-mono text-small text-titanium">
                {secondsLeft > 0 ? `${c.otpStep.resendPrefix} ${minutes}:${seconds}` : ""}
              </span>
              <button
                type="button"
                disabled={secondsLeft > 0}
                onClick={handleResend}
                className={
                  secondsLeft > 0
                    ? "text-titanium/60 border-0 bg-transparent p-0 text-small"
                    : "decoration-cyan/40 border-0 bg-transparent p-0 text-small font-medium text-cyan underline underline-offset-4 hover:decoration-cyan"
                }
              >
                {c.otpStep.resendAction}
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <form noValidate onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-6">
            <LoginIcon />
            <div className="flex flex-col items-center gap-2 text-center">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
                {c.profileStep.kicker}
              </span>
              <h2 className="m-0 text-h2 font-semibold text-fog-white">{c.profileStep.heading}</h2>
              <p className="m-0 text-small leading-[1.7] text-silver">{c.profileStep.subtitle}</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-name" className="text-small font-medium text-fog-white">
                {c.profileStep.nameLabel}
              </label>
              <input
                id="auth-name"
                placeholder={c.profileStep.namePlaceholder}
                className={cn(darkFieldClass, profileForm.formState.errors.fullName && "border-danger")}
                aria-invalid={!!profileForm.formState.errors.fullName}
                {...profileForm.register("fullName")}
              />
              {profileForm.formState.errors.fullName && (
                <span className="text-caption text-danger-dark" role="alert" aria-live="polite">
                  {profileForm.formState.errors.fullName.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-email" className="text-small font-medium text-fog-white">
                {c.profileStep.emailLabel}
              </label>
              <input
                id="auth-email"
                dir="ltr"
                type="email"
                placeholder={c.profileStep.emailPlaceholder}
                className={cn(darkFieldClass, profileForm.formState.errors.email && "border-danger")}
                aria-invalid={!!profileForm.formState.errors.email}
                {...profileForm.register("email")}
              />
              {profileForm.formState.errors.email && (
                <span className="text-caption text-danger-dark" role="alert" aria-live="polite">
                  {profileForm.formState.errors.email.message}
                </span>
              )}
              <span className="text-caption text-titanium">{c.profileStep.emailHint}</span>
            </div>
            <Button
              type="submit"
              loading={profileForm.formState.isSubmitting}
              className="h-12 w-full !bg-white !text-graphite hover:!bg-gray-100"
            >
              {profileForm.formState.isSubmitting ? c.profileStep.submitting : c.profileStep.submit}
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
            <div className="relative mx-auto mb-4 flex size-24 items-center justify-center">
              <div className="border-success/40 absolute inset-0 rounded-full border-2 motion-safe:animate-success-ring motion-reduce:animate-none" />
              <div className="bg-success/15 relative flex size-20 items-center justify-center rounded-full border-2 border-success shadow-[0_0_40px_rgba(47,182,107,0.35)] motion-safe:animate-success-pop motion-reduce:animate-none">
                <svg className="size-12" viewBox="0 0 52 52" aria-hidden="true">
                  <circle cx="26" cy="26" r="25" fill="none" stroke="rgba(47,182,107,0.3)" strokeWidth="2" />
                  <path
                    fill="none"
                    stroke="#2FB66B"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 27l7 7 16-16"
                  />
                </svg>
              </div>
            </div>
            <h2 className="m-0 text-h2 font-semibold text-success">{c.done.heading}</h2>
            <p className="m-0 text-small text-silver">{c.done.body}</p>
            <div className="mt-4 flex w-full flex-col gap-3">
              <Button onClick={() => navigate("/account")} className="h-12 w-full !bg-success !text-white hover:!bg-success-dark">
                {c.done.accountCta}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/")}
                className="!border-white/15 hover:!border-success/40 h-12 w-full !bg-transparent !text-silver hover:!text-white"
              >
                {c.done.homeCta}
              </Button>
            </div>
          </div>
        )}

        <p className="border-white/10 m-0 mt-6 border-t pt-6 text-center text-caption leading-[1.7] text-titanium">
          {c.passwordNote}
        </p>
      </div>
    </div>
  );
}
