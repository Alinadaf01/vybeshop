export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "canceled" | "returned";

export interface OrderShippingAddress {
  title: string;
  province: string;
  city: string;
  line: string;
  postalCode: string;
  receiverName: string;
  receiverPhone: string;
}

export interface OrderItem {
  id: number;
  product: number | null;
  productName: string;
  sku: string;
  price: number;
  colorName: string;
  quantity: number;
  subtotal: number;
}

export interface OrderPayment {
  id: number;
  gateway: string;
  amount: number;
  status: string;
  refId: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface OrderStatusLog {
  fromStatus: string;
  toStatus: string;
  note: string;
  user: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  number: string;
  user: number;
  status: OrderStatus;
  shippingAddress: OrderShippingAddress;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  coupon: number | null;
  note: string;
  trackingCode: string;
  items: OrderItem[];
  payments: OrderPayment[];
  statusLogs: OrderStatusLog[];
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  canceled: "لغو شده",
  returned: "مرجوع شده",
};
