import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Image } from "@/components/ui/Image";
import { Reveal } from "@/components/home/Reveal";

export interface HomeShowcaseBlockProps {
  image: string | null | undefined;
  imageAlt: string;
  kicker?: string;
  title: string;
  description?: string;
  specs: { label: string; value: string }[];
  ctaLabel: string;
  ctaUrl: string;
  theme: "light" | "dark";
  /** Whether the image sits before the text in DOM order — tied to the
   * block's position (slot 1 vs 2) for the alternating layout, independent
   * of `theme` which the owner can set to either value per block. */
  imageFirst: boolean;
}

/** Shared renderer for both homepage showcase blocks — used for the
 * owner-configured dynamic blocks (HOMEPAGE-ADMIN-TASK.md §5) and, via the
 * caller passing product-derived props, for the pre-existing static
 * product-fallback rendering. Keeping one component means both paths always
 * look identical. */
export function HomeShowcaseBlock({
  image,
  imageAlt,
  kicker,
  title,
  description,
  specs,
  ctaLabel,
  ctaUrl,
  theme,
  imageFirst,
}: HomeShowcaseBlockProps) {
  const dark = theme === "dark";

  const imageEl = (
    <Image
      src={image}
      alt={imageAlt}
      width={1200}
      height={1200}
      dark={dark}
      className={cn("aspect-square w-full object-cover", !imageFirst && "order-first lg:order-none")}
    />
  );

  return (
    <section className={cn("grid grid-cols-1 lg:grid-cols-2", dark ? "bg-graphite text-fog-white" : "bg-fog-white")}>
      {imageFirst && imageEl}
      <Reveal className="flex flex-col justify-center gap-6 px-5 py-14 md:py-20 xl:px-10">
        <div className="flex max-w-[520px] flex-col gap-4">
          {kicker && (
            <span dir="ltr" className={cn("font-mono text-micro tracking-[0.08em]", dark ? "text-titanium" : "text-gray-800")}>
              {kicker}
            </span>
          )}
          <h2 className="m-0 text-h2 font-semibold">{title}</h2>
          {description && (
            <p className={cn("m-0 text-body-large", dark ? "text-silver" : "text-gray-800")}>{description}</p>
          )}
        </div>
        {specs.length > 0 && (
          <dl className={cn("m-0 max-w-[420px] border-t", dark ? "border-edge" : "border-gray-100")}>
            {specs.map((spec, index) => (
              <div
                key={`${spec.label}-${index}`}
                className={cn(
                  "flex justify-between gap-4 py-3",
                  index < specs.length - 1 && (dark ? "border-b border-edge" : "border-b border-gray-100"),
                )}
              >
                <dt className={cn("text-small", dark ? "text-titanium" : "text-gray-800")}>{spec.label}</dt>
                <dd dir="ltr" className="m-0 font-mono text-small">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <Link to={ctaUrl} className="self-start">
          <Button variant="text" className={dark ? "border-titanium text-fog-white hover:border-cyan" : undefined}>
            {ctaLabel}
          </Button>
        </Link>
      </Reveal>
      {!imageFirst && imageEl}
    </section>
  );
}
