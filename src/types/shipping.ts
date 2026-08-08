export interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  freeAbove: number | null;
  estimatedDays: string;
}
