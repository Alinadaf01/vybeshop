import { SITE_NAME, absoluteUrl, pageTitle } from "@/lib/seo";
import { useSkipSeo } from "@/lib/prerenderContext";

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: object;
}

/** Renders <title>/<meta>/<link> anywhere in the tree — React 19 hoists them
 * into <head> automatically and cleans them up on unmount, so this just needs
 * to be rendered once per page. Keeps the client-side title/OG tags correct
 * across route navigation, independent of the build-time prerendered HTML. */
export function Seo({ title, description, path, image = "/images/og/default.jpg", type = "website", jsonLd }: SeoProps) {
  const skip = useSkipSeo();
  const fullTitle = pageTitle(title);
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  if (skip) return null;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content="fa_IR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  );
}
