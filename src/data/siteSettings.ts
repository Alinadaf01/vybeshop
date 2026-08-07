export interface BusinessHoursRow {
  day: string;
  time: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface SiteSettings {
  phone: { display: string; href: string };
  email: string;
  address: string;
  businessHours: BusinessHoursRow[];
  socialLinks: SocialLink[];
  trustBadgeLabel: string;
  paymentGatewayLabel: string;
}

export const siteSettings: SiteSettings = {
  phone: { display: "021 1234 5678", href: "+982112345678" },
  email: "hello@vybe.ir",
  address: "تهران، خیابان شریعتی، کوچه بهار، پلاک ۱۲، واحد ۴",
  businessHours: [
    { day: "شنبه تا چهارشنبه", time: "9:00 — 18:00" },
    { day: "پنجشنبه", time: "9:00 — 13:00" },
    { day: "جمعه", time: "تعطیل" },
  ],
  socialLinks: [
    { platform: "INSTAGRAM", url: "#" },
    { platform: "TELEGRAM", url: "#" },
    { platform: "PINTEREST", url: "#" },
    { platform: "YOUTUBE", url: "#" },
  ],
  trustBadgeLabel: "نماد اعتماد",
  paymentGatewayLabel: "درگاه پرداخت",
};
