import { useState } from "react";
import { Link } from "react-router-dom";
import { catalog } from "@/data/catalog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Image } from "@/components/ui/Image";
import { DownloadButton, type DownloadStatus } from "@/components/ui/DownloadButton";
import { Lightbox } from "@/components/ui/Lightbox";
import { Badge } from "@/components/ui/Badge";
import { Seo } from "@/components/seo/Seo";
import { catalogContent as c } from "@/content/catalog";

export default function CatalogPage() {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(0);

  const fileName = catalog.fileUrl.split("/").pop() ?? "vybe-catalog.pdf";

  function handleDownloadStart() {
    setDownloadStatus("preparing");
    setTimeout(() => setDownloadStatus("done"), 1400);
  }

  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/catalog" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "کاتالوگ" }]} />

      <section className="grid grid-cols-1 items-center gap-8 pb-14 md:pb-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-gray-800">
            {c.hero.kickerTemplate(catalog.edition)}
          </p>
          <h1 className="m-0 text-display font-extrabold [text-wrap:pretty]">{catalog.title}</h1>
          <p className="m-0 max-w-text text-body-large leading-[1.7] text-gray-800 [text-wrap:pretty]">
            {catalog.description}
          </p>

          <dl
            dir="ltr"
            className="m-0 flex flex-wrap items-center gap-4 rounded-md border border-gray-100 bg-white p-4 font-mono text-small text-gray-800"
          >
            <div className="flex items-center gap-2">
              <dt className="text-micro">{c.hero.meta.format}</dt>
              <dd className="m-0 text-graphite">{catalog.format}</dd>
            </div>
            <span aria-hidden="true" className="text-silver">
              &middot;
            </span>
            <div className="flex items-center gap-2">
              <dt className="text-micro">{c.hero.meta.size}</dt>
              <dd className="m-0 text-graphite">{catalog.fileSizeMb} MB</dd>
            </div>
            <span aria-hidden="true" className="text-silver">
              &middot;
            </span>
            <div className="flex items-center gap-2">
              <dt className="text-micro">{c.hero.meta.pages}</dt>
              <dd className="m-0 text-graphite">{catalog.pageCount}</dd>
            </div>
            <span aria-hidden="true" className="text-silver">
              &middot;
            </span>
            <div className="flex items-center gap-2">
              <dt className="text-micro">{c.hero.meta.edition}</dt>
              <dd className="m-0 text-graphite">{catalog.edition}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            <DownloadButton
              status={downloadStatus}
              href={catalog.fileUrl}
              fileName={fileName}
              label={c.hero.downloadLabel}
              onDownloadStart={handleDownloadStart}
              onRetry={() => setDownloadStatus("idle")}
            />
            <span className="text-small text-gray-800">{c.hero.freeNote}</span>
          </div>
        </div>

        <Image
          src={catalog.coverImage}
          alt={c.hero.coverAlt}
          width={800}
          height={1131}
          priority
          className="aspect-[1/1.414] w-full rounded-xl border border-gray-100 object-cover"
        />
      </section>

      <section className="flex flex-col gap-8 border-t border-gray-100 py-14 md:py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 text-h2 font-semibold">{c.spreads.heading}</h2>
          <span dir="ltr" className="font-mono text-micro text-gray-800">
            {c.spreads.hint}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
          {catalog.spreads.map((spread, index) => (
            <button
              key={spread.id}
              type="button"
              onClick={() => {
                setSpreadIndex(index);
                setLightboxOpen(true);
              }}
              className="flex flex-col overflow-hidden rounded-lg border border-gray-100 bg-white p-0 text-start transition-colors duration-base hover:border-titanium"
            >
              <Image
                src={spread.image}
                alt={spread.caption}
                width={800}
                height={600}
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="flex items-center justify-between gap-2 border-t border-gray-100 p-3">
                <span className="text-small text-graphite">{spread.caption}</span>
                <span dir="ltr" className="font-mono text-micro text-gray-800">
                  {c.spreads.enlargeLabel}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-t border-gray-100 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex max-w-text flex-col gap-3">
          <h2 className="m-0 text-h2 font-semibold">{c.whatsInside.heading}</h2>
          <p className="m-0 text-body-large leading-[1.7] text-gray-800 [text-wrap:pretty]">{c.whatsInside.subtitle}</p>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {c.whatsInside.items.map((item, index) => (
            <li key={item} className="flex gap-4 border-t border-gray-100 py-3 text-body text-gray-800">
              <span aria-hidden="true" dir="ltr" className="font-mono text-micro text-gray-800">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4 border-t border-gray-100 py-14 md:py-20">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-h2 font-semibold">{c.archive.heading}</h2>
          <p className="m-0 max-w-text text-small text-gray-800">{c.archive.subtitle}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          {catalog.editions.map((edition, index) => (
            <div
              key={edition.label}
              className={
                "flex flex-wrap items-center gap-3 py-3" +
                (index < catalog.editions.length - 1 ? " border-b border-gray-100" : "")
              }
            >
              <span className={edition.isCurrent ? "text-body font-semibold text-graphite" : "text-body text-graphite"}>
                {c.archive.editionLabelTemplate(edition.label)}
              </span>
              <Badge variant={edition.isCurrent ? "solid" : "neutral"}>
                {edition.isCurrent ? c.archive.currentTag : c.archive.archivedTag}
              </Badge>
              <span dir="ltr" className="ms-auto font-mono text-small text-gray-800">
                {c.archive.metaTemplate(edition.pageCount, edition.fileSizeMb)}
              </span>
              <a
                href={edition.fileUrl}
                download
                className="text-small text-gray-800 underline decoration-silver underline-offset-4 hover:decoration-graphite"
              >
                {c.archive.downloadLink}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14 flex flex-col items-start gap-4 rounded-xl bg-graphite p-6 text-fog-white md:mb-20 md:p-12">
        <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-titanium">
          {c.cta.kicker}
        </p>
        <h2 className="m-0 text-h2 font-semibold">{c.cta.heading}</h2>
        <p className="m-0 max-w-text text-body-large leading-[1.7] text-silver [text-wrap:pretty]">{c.cta.subtitle}</p>
        <Link
          to="/products"
          className="grid h-12 place-items-center rounded-md bg-white px-8 text-body font-medium text-graphite no-underline transition-colors duration-fast hover:bg-gray-100"
        >
          {c.cta.action}
        </Link>
      </section>

      <div className="sticky bottom-0 z-40 -mx-5 flex items-center gap-3 border-t border-gray-100 bg-white px-5 py-2 lg:hidden xl:-mx-10 xl:px-10">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-small font-semibold">{c.mobileBar.titleTemplate(catalog.edition)}</span>
          <span dir="ltr" className="font-mono text-micro text-gray-800">
            {c.mobileBar.metaTemplate(catalog.fileSizeMb, catalog.pageCount)}
          </span>
        </div>
        <a
          href={catalog.fileUrl}
          download={fileName}
          onClick={handleDownloadStart}
          className="ms-auto grid h-12 shrink-0 place-items-center rounded-md bg-graphite px-6 text-body font-medium text-fog-white no-underline transition-colors duration-fast hover:bg-ink"
        >
          {c.mobileBar.downloadLabel}
        </a>
      </div>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={catalog.spreads.map((spread) => spread.image)}
        index={spreadIndex}
        onIndexChange={setSpreadIndex}
        title={c.spreads.heading}
      />
    </div>
  );
}
