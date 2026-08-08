export interface Address {
  id: string;
  title: string;
  province: string;
  city: string;
  line: string;
  postalCode: string;
  receiverName: string;
  receiverPhone: string;
  isDefault: boolean;
  createdAt: string;
}

export type AddressInput = Omit<Address, "id" | "createdAt">;
