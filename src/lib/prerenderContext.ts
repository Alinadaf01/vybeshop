import { createContext, useContext } from "react";

/**
 * True only inside src/entry-server.tsx's body-only render pass. The
 * prerender script builds <head> tags itself from RouteHead data, so <Seo>
 * renders nothing there — otherwise its <title>/<meta>/<script> tags would
 * end up as literal siblings inside <body> (there's no real <head> in a
 * body-fragment render for renderToStaticMarkup to hoist them into).
 */
const SkipSeoContext = createContext(false);

export const SkipSeoProvider = SkipSeoContext.Provider;

export function useSkipSeo(): boolean {
  return useContext(SkipSeoContext);
}
