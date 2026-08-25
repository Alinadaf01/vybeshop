import { useEffect, useState } from "react";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const DEFAULT_WIDTHS = [400, 800, 1200];

export interface ImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  /** Above-the-fold images should set this to skip loading="lazy". */
  priority?: boolean;
  /** Candidate widths for the generated WebP srcset. */
  widths?: number[];
  sizes?: string;
  className?: string;
  /** Fallback placeholder variant while the real file is missing. */
  dark?: boolean;
}

function stripExtension(path: string) {
  return path.replace(/\.[^./]+$/, "");
}

/**
 * Real product/category/blog photography isn't delivered yet, so this always
 * tries the real <img> first and falls back to the same diagonal-stripe
 * placeholder ImagePlaceholder renders on load failure — pages just render
 * <Image>, and it starts showing real photos the moment files land under
 * src, with zero page-code changes.
 *
 * WebP srcset assumes files are delivered as `{base}-{width}.webp` beside
 * the given src (e.g. `1.jpg` -> `1-400.webp`, `1-800.webp`, ...). This is
 * only guaranteed for static assets under public/images (enforced by
 * scripts/check-image-widths.mjs) — a file uploaded through the admin panel
 * (an absolute http(s) URL pointing at Django's /media/) has no such backend
 * pipeline generating those companions. Requesting a nonexistent webp
 * variant cross-origin gets blocked by ORB, which some browsers propagate as
 * a failure to the sibling <img> too, breaking the whole image. So webp
 * srcset is only attempted for relative (static) paths.
 */
export function Image({
  src,
  alt,
  width,
  height,
  priority = false,
  widths = DEFAULT_WIDTHS,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
  dark,
}: ImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <ImagePlaceholder caption={alt} dark={dark} className={className} style={{ aspectRatio: `${width} / ${height}` }} />
    );
  }

  const hasWebpVariants = !/^https?:\/\//.test(src);

  const img = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      onError={() => setFailed(true)}
      className={className}
    />
  );

  if (!hasWebpVariants) return img;

  const base = stripExtension(src);
  const webpSrcSet = widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ");

  return (
    // display:contents so <picture> doesn't add its own (inline) box — the
    // <img> below is the one callers style via className, same as a plain <img>.
    // <source> normally generates no box at all, but display:contents on its
    // parent "unwraps" picture and promotes ALL its children — including
    // <source> — into the grandparent's own layout algorithm. In a CSS Grid
    // parent this silently adds a second (invisible) auto-placed item before
    // <img>, pushing the real image into row 2 under the *first* column
    // instead of beside it in column 2. `hidden` (display:none) keeps
    // <source> out of layout entirely without affecting picture's own
    // source-selection, which reads srcSet/type/media regardless of CSS.
    <picture className="contents">
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} className="hidden" />
      {img}
    </picture>
  );
}
