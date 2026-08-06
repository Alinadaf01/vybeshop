import { useEffect, useState } from "react";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const DEFAULT_WIDTHS = [400, 800, 1200];

export interface ImageProps {
  src: string;
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
 * the given src (e.g. `1.jpg` -> `1-400.webp`, `1-800.webp`, ...). Confirm
 * this naming with design once real exports arrive and adjust here if it
 * differs — this is the one place that convention is encoded.
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

  if (failed) {
    return (
      <ImagePlaceholder caption={alt} dark={dark} className={className} style={{ aspectRatio: `${width} / ${height}` }} />
    );
  }

  const base = stripExtension(src);
  const webpSrcSet = widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ");

  return (
    // display:contents so <picture> doesn't add its own (inline) box — the
    // <img> below is the one callers style via className, same as a plain <img>.
    <picture className="contents">
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
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
    </picture>
  );
}
