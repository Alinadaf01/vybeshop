export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  addedAt: string;
}
