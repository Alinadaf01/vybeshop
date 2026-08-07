export const catalogContent = {
  seo: {
    title: "کاتالوگ",
    description:
      "کاتالوگ کامل محصولات VYBE با ابعاد، متریال، ارتفاع لایه و زمان چاپ هر قطعه — دانلود آزاد، بدون فرم.",
  },
  hero: {
    kickerTemplate: (edition: string) => `CATALOG · EDITION ${edition}`,
    subtitle:
      "۵۳ قطعه با ابعاد، متریال، ارتفاع لایه و زمان چاپ. همان اطلاعاتی که در کارگاه روی برگه کار هر قطعه نوشته می‌شود.",
    meta: {
      format: "FORMAT",
      size: "SIZE",
      pages: "PAGES",
      edition: "EDITION",
    },
    downloadLabel: "دانلود کاتالوگ",
    freeNote: "دانلود آزاد است؛ ثبت ایمیل لازم نیست.",
    coverAlt: "جلد کاتالوگ VYBE",
  },
  spreads: {
    heading: "شش اسپرد از داخل",
    hint: "CLICK TO ENLARGE",
    enlargeLabel: "بزرگ‌نمایی",
  },
  whatsInside: {
    heading: "داخلش چیست",
    subtitle:
      "کاتالوگ برای زمانی است که می‌خواهید قطعه‌ها را کنار هم ببینید و ابعاد را با میز و قفسه خودتان بسنجید.",
    items: [
      "هر ۵۳ قطعه با عکس، ابعاد و وزن",
      "جدول متریال: PLA+، PETG، تحمل حرارت",
      "راهنمای ابعاد در مقیاس ۱:۱ برای چاپ",
      "پارامترهای چاپ هر قطعه: ارتفاع لایه، زمان",
      "نقشه دسته‌بندی‌ها و کد مدل‌ها",
    ],
  },
  archive: {
    heading: "آرشیو ویرایش‌ها",
    subtitle: "ویرایش‌های قبلی برای مقایسه تغییرات ابعاد و قیمت در دسترس می‌مانند.",
    editionLabelTemplate: (label: string) => `ویرایش ${label}`,
    currentTag: "نسخه جاری",
    archivedTag: "بایگانی",
    metaTemplate: (pages: number, sizeMb: number) => `${pages} صفحه · ${sizeMb} MB`,
    downloadLink: "دانلود",
  },
  mobileBar: {
    titleTemplate: (edition: string) => `کاتالوگ ${edition}`,
    metaTemplate: (sizeMb: number, pages: number) => `PDF · ${sizeMb} MB · ${pages} صفحه`,
    downloadLabel: "دانلود",
  },
  cta: {
    kicker: "NEXT",
    heading: "ترجیح می‌دهید همین‌جا ببینید؟",
    subtitle: "همه قطعه‌های کاتالوگ با همان مشخصات در صفحه محصولات هستند و همیشه به‌روزتر از فایل PDF.",
    action: "دیدن ۵۳ محصول",
  },
};
