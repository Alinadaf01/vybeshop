import type { PaymentGatewayCode } from "@/types/order";

export interface PaymentGateway {
  code: PaymentGatewayCode;
  name: string;
  logo: string | null;
  description: string | null;
  order: number;
}
