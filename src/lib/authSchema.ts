import { z } from "zod";

const REQUIRED_MESSAGE = "این فیلد الزامی است.";
const PHONE_MESSAGE = "شماره موبایل باید ۱۱ رقمی و با ۰۹ شروع شود.";

export const phoneFormSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, PHONE_MESSAGE),
  rules: z.boolean().refine((value) => value === true, "برای ادامه باید شرایط را بپذیرید."),
});
export type PhoneFormValues = z.infer<typeof phoneFormSchema>;

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, REQUIRED_MESSAGE),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "ایمیل معتبر نیست."),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const addressFormSchema = z.object({
  title: z.string().trim().min(1, REQUIRED_MESSAGE),
  receiverName: z.string().trim().min(1, REQUIRED_MESSAGE),
  postalCode: z.string().regex(/^\d{10}$/, "کد پستی باید دقیقاً ۱۰ رقم باشد."),
  receiverPhone: z.string().regex(/^09\d{9}$/, PHONE_MESSAGE),
  province: z.string().trim().min(1, REQUIRED_MESSAGE),
  city: z.string().trim().min(1, REQUIRED_MESSAGE),
  line: z.string().trim().min(1, REQUIRED_MESSAGE),
  isDefault: z.boolean(),
});
export type AddressFormValues = z.infer<typeof addressFormSchema>;
