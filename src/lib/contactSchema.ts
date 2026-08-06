import { z } from "zod";

const REQUIRED_MESSAGE = "این فیلد الزامی است.";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_MESSAGE),
  email: z.string().superRefine((value, ctx) => {
    const trimmed = value.trim();
    if (!trimmed) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: REQUIRED_MESSAGE });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ایمیل معتبر نیست. الگوی درست: name@example.com",
      });
    }
  }),
  subject: z.string().min(1, "یک موضوع انتخاب کنید."),
  message: z.string().superRefine((value, ctx) => {
    const trimmed = value.trim();
    if (!trimmed) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: REQUIRED_MESSAGE });
      return;
    }
    if (trimmed.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "پیام کوتاه است؛ کد مدل قطعه و توضیح کوتاه مسئله را بنویسید.",
      });
    }
  }),
  newsletter: z.boolean(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
