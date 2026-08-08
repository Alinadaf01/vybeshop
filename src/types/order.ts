export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "canceled" | "returned";

export interface OrderSummary {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
  paidAt: string | null;
}

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
  id: string;
  productName: string;
  sku: string;
  price: number;
  colorName: string;
  quantity: number;
  subtotal: number;
}

export type PaymentGatewayCode = "ZARINPAL" | "IDPAY" | "SNAPPPAY" | "DIGIPAY";

export interface OrderPayment {
  id: string;
  gateway: PaymentGatewayCode;
  gatewayName: string;
  amount: number;
  refId: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
  verifiedAt: string | null;
}

export interface OrderStatusLogEntry {
  fromStatus: string;
  toStatus: string;
  note: string;
  user: string | null;
  createdAt: string;
}

export interface Order extends OrderSummary {
  shippingAddress: OrderShippingAddress;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  note: string;
  trackingCode: string;
  items: OrderItem[];
  payments: OrderPayment[];
  statusLogs: OrderStatusLogEntry[];
  shippedAt: string | null;
}
