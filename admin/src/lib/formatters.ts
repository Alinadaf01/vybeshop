import { toJalaali } from "jalaali-js";

// Same implementation as the storefront's src/lib/formatters.ts — duplicated
// rather than cross-imported (see api.ts's header comment). formatDimensions
// isn't included yet since no admin page needs it until A2's product form.

const persianMonths = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function formatPrice(value: number): string {
  return `${value.toLocaleString("en-US")} تومان`;
}

export function formatJalaliDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const { jy, jm, jd } = toJalaali(date);
  return `${jd} ${persianMonths[jm - 1]} ${jy}`;
}

export function formatJalaliDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatJalaliDate(date)} · ${hours}:${minutes}`;
}
