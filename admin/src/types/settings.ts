export interface BusinessHour {
  day: string;
  time: string;
}

export interface AdminSiteSettings {
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  address: string;
  businessHours: BusinessHour[];
  instagramUrl: string;
  telegramUrl: string;
  whatsappUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  pinterestUrl: string;
  googleMapsEmbed: string;
  latitude: number | null;
  longitude: number | null;
  trustBadgeLabel: string;
  trustBadgeImage: string | null;
  trustBadgeUrl: string;
  paymentGatewayLabel: string;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  defaultOgImage: string | null;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  ownerNotificationPhone: string;
  notifyOwnerNewOrder: boolean;
}

export type ApiCredentialService = "kavenegar" | "zarinpal" | "idpay" | "snapppay" | "digipay";

export const API_CREDENTIAL_SERVICE_LABELS: Record<ApiCredentialService, string> = {
  kavenegar: "کاوه‌نگار (پیامک)",
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  snapppay: "اسنپ‌پی",
  digipay: "دیجی‌پی",
};

export interface ApiCredential {
  id: string;
  service: ApiCredentialService;
  label: string;
  isActive: boolean;
  isSandbox: boolean;
  order: number;
  isConfigured: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  freeAbove: number | null;
  estimatedDays: string;
  isActive: boolean;
  order: number;
}
