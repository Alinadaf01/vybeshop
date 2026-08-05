import type { CartItem } from "@/types/cart";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  status: OrderStatus;
  total: number;
  createdAt: string;
  customer: OrderCustomer;
}
