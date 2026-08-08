export interface CartProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  inStock: boolean;
  stockCount: number;
}

export interface CartColorOption {
  id: string;
  name: string;
  hex: string;
  inStock: boolean;
}

export interface CartItem {
  id: string;
  product: CartProduct;
  colorOption: CartColorOption | null;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}
