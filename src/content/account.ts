// Orders/order-detail are static placeholder content — there is no orders
// API yet (that lands in phase B4, cart/checkout). Everything else on this
// page (profile, addresses) is wired to the real backend from B3.

export type DemoOrderStatus = "processing" | "shipped" | "delivered" | "canceled";

export interface DemoOrderItem {
  code: string;
  name: string;
  variant: string;
  quantity: number;
  price: number;
}

export interface DemoOrder {
  number: string;
  date: string;
  gateway: string;
  status: DemoOrderStatus;
  total: number;
  items: DemoOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  refId: string;
  paidAt: string;
  trackingCode: string | null;
  deliveryAddress: string;
  timeline: { label: string; timestamp: string | null; done: boolean }[];
}

export const demoOrders: DemoOrder[] = [
  {
    number: "VYB-1404-0837",
    date: "1404/03/12",
    gateway: "ZARINPAL",
    status: "processing",
    total: 3161000,
    subtotal: 3245000,
    discount: 162000,
    shipping: 78000,
    refId: "RRN-88421703",
    paidAt: "1404/03/12 · 14:23",
    trackingCode: null,
    deliveryAddress: "سارا محمدی — تهران، خیابان شریعتی، کوچه بهار، پلاک ۱۲، واحد ۴",
    items: [
      { code: "W4001", name: "جاکارتی مینیمال مدل W4001", variant: "گرافیت · ۲ عدد", quantity: 2, price: 2114000 },
      { code: "W4002", name: "جامدادی زاویه‌دار مدل W4002", variant: "سفید مه · ۱ عدد", quantity: 1, price: 742000 },
      { code: "C8001", name: "پایه گوشی خودرو مدل C8001", variant: "تیتانیوم · ۱ عدد", quantity: 1, price: 389000 },
    ],
    timeline: [
      { label: "ثبت سفارش", timestamp: "1404/03/12 · 14:22", done: true },
      { label: "پرداخت تأیید شد — زرین‌پال", timestamp: "1404/03/12 · 14:23", done: true },
      { label: "در صف چاپ", timestamp: "1404/03/12 · 18:40", done: true },
      { label: "در حال آماده‌سازی", timestamp: "1404/03/13 · 09:15", done: true },
      { label: "تحویل به پست", timestamp: null, done: false },
      { label: "تحویل به شما", timestamp: null, done: false },
    ],
  },
  {
    number: "VYB-1404-0791",
    date: "1404/02/27",
    gateway: "SEP",
    status: "shipped",
    total: 742000,
    subtotal: 742000,
    discount: 0,
    shipping: 0,
    refId: "RRN-77310298",
    paidAt: "1404/02/27 · 11:05",
    trackingCode: "1566743511",
    deliveryAddress: "سارا محمدی — تهران، خیابان ولیعصر، برج نگین، طبقه ۷، واحد ۷۰۲",
    items: [{ code: "W4002", name: "جامدادی زاویه‌دار مدل W4002", variant: "سفید مه · ۱ عدد", quantity: 1, price: 742000 }],
    timeline: [
      { label: "ثبت سفارش", timestamp: "1404/02/27 · 11:04", done: true },
      { label: "پرداخت تأیید شد — SEP", timestamp: "1404/02/27 · 11:05", done: true },
      { label: "در صف چاپ", timestamp: "1404/02/27 · 16:00", done: true },
      { label: "در حال آماده‌سازی", timestamp: "1404/02/28 · 10:00", done: true },
      { label: "تحویل به پست", timestamp: "1404/02/28 · 17:30", done: true },
      { label: "تحویل به شما", timestamp: null, done: false },
    ],
  },
  {
    number: "VYB-1404-0742",
    date: "1404/02/05",
    gateway: "BEHPARDA",
    status: "delivered",
    total: 1690000,
    subtotal: 1690000,
    discount: 0,
    shipping: 0,
    refId: "RRN-65029841",
    paidAt: "1404/02/05 · 09:40",
    trackingCode: "1566743498",
    deliveryAddress: "سارا محمدی — تهران، خیابان شریعتی، کوچه بهار، پلاک ۱۲، واحد ۴",
    items: [{ code: "S1003", name: "پایه رومیزی مدل S1003", variant: "گرافیت · ۱ عدد", quantity: 1, price: 1690000 }],
    timeline: [
      { label: "ثبت سفارش", timestamp: "1404/02/05 · 09:39", done: true },
      { label: "پرداخت تأیید شد — به‌پرداخت", timestamp: "1404/02/05 · 09:40", done: true },
      { label: "در صف چاپ", timestamp: "1404/02/05 · 14:00", done: true },
      { label: "در حال آماده‌سازی", timestamp: "1404/02/06 · 09:00", done: true },
      { label: "تحویل به پست", timestamp: "1404/02/06 · 16:00", done: true },
      { label: "تحویل به شما", timestamp: "1404/02/09 · 12:30", done: true },
    ],
  },
  {
    number: "VYB-1403-0688",
    date: "1403/12/19",
    gateway: "ASANPARD",
    status: "canceled",
    total: 389000,
    subtotal: 389000,
    discount: 0,
    shipping: 0,
    refId: "—",
    paidAt: "—",
    trackingCode: null,
    deliveryAddress: "سارا محمدی — تهران، خیابان شریعتی، کوچه بهار، پلاک ۱۲، واحد ۴",
    items: [{ code: "C8001", name: "پایه گوشی خودرو مدل C8001", variant: "تیتانیوم · ۱ عدد", quantity: 1, price: 389000 }],
    timeline: [
      { label: "ثبت سفارش", timestamp: "1403/12/19 · 10:00", done: true },
      { label: "لغو شد", timestamp: "1403/12/19 · 15:00", done: true },
    ],
  },
];

export const orderStatusLabel: Record<DemoOrderStatus, string> = {
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شد",
  canceled: "لغو شد",
};

export const accountContent = {
  seo: { title: "حساب کاربری", description: "سفارش‌ها، آدرس‌ها و اطلاعات حساب کاربری شما در VYBE." },
  breadcrumbLabel: "حساب کاربری",
  logout: "خروج از حساب",
  tabs: {
    orders: "سفارش‌های من",
    detail: "جزئیات سفارش",
    addresses: "آدرس‌ها",
    profile: "اطلاعات حساب",
  },
  orders: {
    heading: "سفارش‌های من",
    countTemplate: (n: number) => `${n} سفارش`,
    detailsCta: "جزئیات",
    empty: {
      heading: "هنوز سفارشی ثبت نکرده‌اید",
      body: "وقتی اولین سفارش را ثبت کنید، وضعیت و کد رهگیری‌اش همین‌جا می‌آید.",
      cta: "دیدن محصولات",
    },
  },
  detail: {
    back: "بازگشت",
    orderTitle: (number: string) => `سفارش ${number}`,
    statusHeading: "وضعیت سفارش",
    trackingLabel: "TRACKING",
    trackingPending: "هنوز صادر نشده",
    itemsHeading: "اقلام سفارش",
    paymentHeading: "پرداخت",
    subtotalLabel: "جمع کالاها",
    discountLabel: "تخفیف",
    shippingLabel: "ارسال",
    totalLabel: "پرداخت‌شده",
    gatewayLabel: "درگاه پرداخت",
    refIdLabel: "کد رهگیری",
    paidAtLabel: "زمان تراکنش",
    addressHeading: "آدرس تحویل",
    invoiceButton: "دانلود فاکتور",
    invoiceUnavailable: "خروجی فاکتور در فاز بعدی فعال می‌شود.",
    cancelButton: "درخواست لغو",
  },
  addresses: {
    heading: "آدرس‌ها",
    countTemplate: (n: number) => `${n} آدرس ذخیره‌شده`,
    addNew: "+ آدرس جدید",
    defaultBadge: "پیش‌فرض",
    edit: "ویرایش",
    makeDefault: "پیش‌فرض کن",
    remove: "حذف",
    empty: "هیچ آدرسی ذخیره نشده است. اولین آدرس را در همین صفحه اضافه کنید.",
    form: {
      addHeading: "افزودن آدرس",
      editHeading: "ویرایش آدرس",
      titleLabel: "عنوان آدرس *",
      titlePlaceholder: "خانه، محل کار",
      nameLabel: "گیرنده *",
      namePlaceholder: "نام و نام خانوادگی",
      postalLabel: "کد پستی *",
      postalPlaceholder: "۱۰ رقم",
      phoneLabel: "موبایل *",
      phonePlaceholder: "09xxxxxxxxx",
      lineLabel: "نشانی کامل *",
      linePlaceholder: "خیابان، کوچه، پلاک، واحد",
      provinceLabel: "استان *",
      cityLabel: "شهر *",
      defaultLabel: "این آدرس پیش‌فرض باشد.",
      save: "ذخیره آدرس",
      saving: "در حال ذخیره…",
      cancel: "انصراف",
      formError: "چند فیلد کامل نیست. موارد مشخص‌شده را بررسی کنید.",
      saveError: "آدرس ذخیره نشد. دوباره تلاش کنید.",
    },
  },
  profile: {
    heading: "اطلاعات حساب",
    firstNameLabel: "نام",
    lastNameLabel: "نام خانوادگی",
    emailLabel: "ایمیل",
    phoneLabel: "شماره موبایل",
    phoneHint: "شماره موبایل شناسه ورود است و تغییر آن نیاز به تأیید پیامکی دارد.",
    save: "ذخیره تغییرات",
    saving: "در حال ذخیره…",
    saveSuccess: "تغییرات ذخیره شد.",
    saveError: "ذخیره تغییرات ناموفق بود.",
  },
};
