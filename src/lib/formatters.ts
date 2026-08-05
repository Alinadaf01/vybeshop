import { toJalaali } from "jalaali-js";
import type { ProductDimensions } from "@/types/product";

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

export function formatDimensions({ w, h, d }: ProductDimensions): string {
  return `${w} × ${h} × ${d} mm`;
}

export function formatJalaliDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const { jy, jm, jd } = toJalaali(date);
  return `${jd} ${persianMonths[jm - 1]} ${jy}`;
}
