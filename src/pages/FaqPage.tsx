import { Link } from "react-router-dom";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Seo } from "@/components/seo/Seo";
import { faqContent as c } from "@/content/faq";

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-page px-5 xl:px-10">
      <Seo title={c.seo.title} description={c.seo.description} path="/faq" />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: c.heading }]} />

      <div className="flex flex-col gap-3 pb-12">
        <h1 className="m-0 text-h1 font-bold">{c.heading}</h1>
        <p className="m-0 max-w-text text-body-large text-gray-800 [text-wrap:pretty]">{c.subtitle}</p>
      </div>

      <div className="flex flex-col gap-14 pb-14 md:gap-20 md:pb-20">
        {c.groups.map((group) => (
          <section key={group.heading} className="flex flex-col gap-6">
            <h2 className="m-0 text-h2 font-semibold">{group.heading}</h2>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              {group.items.map((item, index) => (
                <details
                  key={item.question}
                  className={
                    "group bg-white px-4 py-3" + (index < group.items.length - 1 ? " border-b border-gray-100" : "")
                  }
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium text-graphite marker:content-none">
                    {item.question}
                    <span
                      aria-hidden="true"
                      className="font-mono text-h4 text-titanium transition-colors duration-fast group-open:hidden"
                    >
                      +
                    </span>
                    <span aria-hidden="true" className="hidden font-mono text-h4 text-titanium group-open:block">
                      &minus;
                    </span>
                  </summary>
                  <p className="m-0 mt-3 max-w-text text-body leading-[1.7] text-gray-800 [text-wrap:pretty]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 py-12">
        <p className="m-0 text-body text-gray-800">{c.contactCta.body}</p>
        <Link
          to={c.contactCta.href}
          className="text-body font-medium text-graphite underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-fast hover:text-cyan"
        >
          {c.contactCta.label}
        </Link>
      </div>
    </div>
  );
}
