import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { categories } from "@/data/categories";
import { formatPrice } from "@/lib/formatters";
import { Image } from "@/components/ui/Image";

export function ProductCard({ product }: { product: Product }) {
  const categoryName = categories.find((c) => c.slug === product.category)?.name ?? product.category;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-100 bg-white no-underline transition-colors duration-base hover:border-titanium"
    >
      <span className="block overflow-hidden">
        <Image
          src={product.images[0]}
          alt={product.name}
          width={800}
          height={1000}
          className="aspect-[4/5] w-full object-cover transition-transform duration-slow group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
      <span className="flex flex-col gap-2 p-4">
        <span dir="ltr" className="font-mono text-micro tracking-[0.06em] text-gray-800">
          {categoryName}
        </span>
        <span className="text-[18px] font-bold leading-[1.35] text-graphite [text-wrap:pretty]">{product.name}</span>
        <span className="text-small text-gray-800">{product.shortDescription}</span>
        <span dir="ltr" className="self-start font-mono text-small text-gray-800">
          {formatPrice(product.price)}
        </span>
      </span>
    </Link>
  );
}
