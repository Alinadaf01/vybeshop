export const contactContent = {
  seo: {
    title: "تماس با ما",
    description:
      "سؤال درباره ابعاد، سفارش عمده یا ایراد یک قطعه — با کارگاه VYBE در تماس باشید. پاسخ معمولاً زیر یک روز کاری است.",
  },
  heading: "تماس با ما",
  subtitle:
    "سؤال درباره ابعاد، سفارش عمده یا ایراد یک قطعه — همه از همین یک فرم. پاسخ در ساعات کاری معمولاً زیر یک روز کاری است.",
  form: {
    heading: "فرم پیام",
    requiredNote: "فیلدهای ستاره‌دار الزامی است.",
    fields: {
      name: { label: "نام و نام خانوادگی *", placeholder: "مثلاً سارا محمدی" },
      email: { label: "ایمیل *", placeholder: "name@example.com" },
      subject: { label: "موضوع *", placeholder: "انتخاب کنید" },
      message: { label: "پیام *", placeholder: "کد مدل قطعه و توضیح کوتاه مسئله را بنویسید." },
    },
    subjectOptions: ["سؤال درباره محصول", "پیگیری سفارش", "ایراد یا مرجوعی", "سفارش عمده", "همکاری"],
    newsletterLabel: "خبرنامه ماهانه کارگاه را هم برایم بفرستید.",
    submit: "ارسال پیام",
    submitting: "در حال ارسال…",
    submitNote: "پاسخ به همین ایمیل فرستاده می‌شود.",
    formError: "چند فیلد کامل نیست. موارد مشخص‌شده را بررسی کنید.",
    success: {
      title: "پیام شما ثبت شد",
      trackingTemplate: (id: string) => `شماره پیگیری ${id} — پاسخ به ایمیل شما فرستاده می‌شود، معمولاً زیر یک روز کاری.`,
      again: "ارسال پیام دیگر",
    },
    error: {
      title: "پیام ارسال نشد",
      description: "ارتباط با سرور قطع شد. متن پیام حفظ شده است؛ می‌توانید دوباره تلاش کنید.",
      retry: "تلاش مجدد",
    },
  },
  // Values (phone/email/address/hours/social) come from getSiteSettings() in
  // src/lib/api.ts — these are just the static field captions.
  info: {
    addressLabel: "ADDRESS",
    emailLabel: "EMAIL",
    phoneLabel: "PHONE",
    hoursLabel: "HOURS",
    socialLabel: "SOCIAL",
  },
  map: {
    caption: "MAP · GRAYSCALE STYLE — جای‌نگهدار نقشه",
    directionsLink: "مسیریابی روی نقشه",
  },
  faq: {
    kicker: "FAQ",
    heading: "سؤالات متداول",
    items: [
      {
        question: "ارسال چند روز طول می‌کشد؟",
        answer:
          "قطعه‌های موجود ۲ تا ۴ روز کاری. پیش‌سفارش‌ها بعد از چاپ ارسال می‌شوند و زمان تقریبی در صفحه محصول نوشته شده است.",
      },
      {
        question: "اگر قطعه بشکند چه می‌شود؟",
        answer:
          "فایل و کد مدل هر قطعه نگه داشته می‌شود. عکس بفرستید؛ اگر ایراد از ساخت باشد قطعه جدید چاپ و بدون هزینه ارسال می‌شود.",
      },
      {
        question: "سفارش با ابعاد دلخواه می‌گیرید؟",
        answer: "برای ابعاد خاص روی قطعه‌های موجود بله. طراحی از صفر را فعلاً فقط برای سفارش‌های بالای ۲۰ عدد قبول می‌کنیم.",
      },
      {
        question: "قطعه‌ها در گرما تغییر شکل می‌دهند؟",
        answer: "PLA+ تا حدود ۵۵ درجه پایدار است و برای داخل خودرو در تابستان مناسب نیست. برای آن موارد نسخه PETG داریم.",
      },
      {
        question: "امکان فاکتور رسمی هست؟",
        answer: "بله. در توضیحات سفارش بنویسید یا از همین فرم اطلاعات شرکت را بفرستید.",
      },
    ],
  },
};
