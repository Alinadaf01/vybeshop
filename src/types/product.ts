export interface ColorOption {
  name: string;
  hex: string;
  inStock: boolean;
}

export interface ProductDimensions {
  w: number;
  h: number;
  d: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  colorName: string;
  colorHex: string;
  sku: string;
  image: string;
  inStock: boolean;
  stockCount: number;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  colors: ColorOption[];
  material: string;
  dimensions: ProductDimensions;
  weight: number;
  layerHeight: number;
  inStock: boolean;
  stockCount: number;
}
