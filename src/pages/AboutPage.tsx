import { Link } from "react-router-dom";
import { Image } from "@/components/ui/Image";
import { Seo } from "@/components/seo/Seo";
import { useCountUp } from "@/lib/useCountUp";
import { aboutContent as c } from "@/content/about";

/** اعداد چهارگانه بالای صفحه هنگام دیده‌شدن می‌شمارند؛ مقادیر غیرعددی
 * (مثل "IRAN") بدون انیمیشن همان‌طور نمایش داده می‌شوند (FIX-TASK.md §3). */
function StatValue({ value }: { value: string }) {
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const { ref, value: current } = useCountUp<HTMLSpanElement>(match ? Number(match[2]) : 0);

  if (!match) return <>{value}</>;
  const [, prefix, , suffix] = match;
  return (
    <span ref={ref}>
      {prefix}
      {current}
      {suffix}
    </span>
  );
}

export default function AboutPage() {
  return (
    <div>
      <Seo title={c.seo.title} description={c.seo.description} path="/about" />
      <section className="bg-graphite px-5 py-14 text-fog-white md:py-20 xl:px-10">
        <div className="mx-auto flex max-w-page flex-col gap-6">
          <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-titanium">
            {c.mission.kicker}
          </p>
          <h1 className="m-0 max-w-[900px] text-display font-extrabold [text-wrap:pretty]">{c.mission.heading}</h1>
          <p className="m-0 max-w-text text-body-large leading-[1.7] text-silver [text-wrap:pretty]">
            {c.mission.subtitle}
          </p>
          <dl dir="ltr" className="m-0 mt-4 grid grid-cols-2 gap-6 border-t border-edge pt-6 md:grid-cols-4">
            {c.mission.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="font-mono text-micro text-titanium">{stat.label}</dt>
                <dd className="m-0 font-mono text-h3 text-white">
                  <StatValue value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-fog-white px-5 py-14 md:py-20 xl:px-10">
        <div className="mx-auto grid max-w-page grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex max-w-text flex-col gap-4">
            <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-gray-800">
              {c.whyWeExist.kicker}
            </p>
            <h2 className="m-0 text-h1 font-bold [text-wrap:pretty]">{c.whyWeExist.heading}</h2>
            {c.whyWeExist.paragraphs.map((paragraph) => (
              <p key={paragraph} className="m-0 text-body-large leading-[1.7] text-gray-800 [text-wrap:pretty]">
                {paragraph}
              </p>
            ))}
          </div>
          <Image
            src="/images/about/macro-surface.jpg"
            alt={c.whyWeExist.imageAlt}
            width={1200}
            height={900}
            className="aspect-[4/3] w-full rounded-xl border border-gray-100 object-cover"
          />
        </div>
      </section>

      <section className="bg-fog-white px-5 pb-14 md:pb-20 xl:px-10">
        <div className="mx-auto flex max-w-page flex-col gap-6 border-t border-gray-100 pt-14 md:pt-20">
          <div className="flex flex-col gap-2">
            <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-gray-800">
              {c.principles.kicker}
            </p>
            <h2 className="m-0 text-h1 font-bold">{c.principles.heading}</h2>
          </div>
          <div className="flex flex-col">
            {c.principles.items.map((item, index) => (
              <div
                key={item.title}
                className="flex flex-col gap-2 border-t border-gray-100 py-6 md:flex-row md:gap-8"
              >
                <span aria-hidden="true" dir="ltr" className="font-mono text-caption text-gray-800 md:w-16">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-h3 font-semibold md:w-[240px]">{item.title}</span>
                <span className="text-body leading-[1.7] text-gray-800 [text-wrap:pretty] md:flex-1">{item.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-graphite px-5 py-14 text-fog-white md:py-20 xl:px-10">
        <div className="mx-auto flex max-w-page flex-col gap-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            {/* «عکس کارگاه درباره ما» (WHERE IDEAS BECOME REAL) جایگاهش
            همین‌جاست، نه سکشن «جایی که ایده‌ها واقعی می‌شوند» — طبق نگاشت
            design/HANDOFF.md (FIX-TASK.md دور چهارم). */}
            <Image
              src="/images/marketing/workshop-wide.jpg"
              alt={c.process.bannerImageAlt}
              width={715}
              height={437}
              dark
              className="h-[320px] w-full rounded-lg border border-edge object-cover"
            />
            <div className="flex flex-col gap-4">
              <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-titanium">
                {c.process.kicker}
              </p>
              <h2 className="m-0 text-h1 font-bold [text-wrap:pretty]">{c.process.heading}</h2>
              <p className="m-0 max-w-text text-body-large leading-[1.7] text-silver [text-wrap:pretty]">
                {c.process.body}
              </p>
              <div
                dir="ltr"
                className="flex flex-wrap gap-6 border-t border-edge pt-6 font-mono text-caption tracking-[0.06em] text-titanium"
              >
                {c.process.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {c.process.steps.map((step) => (
              <div key={step.tag} className="flex flex-col gap-2 rounded-lg border border-edge bg-surface p-4">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-silver">
                  {step.tag}
                </span>
                <span className="text-h4 font-h4 text-white">{step.title}</span>
                <span className="text-small leading-[1.7] text-silver [text-wrap:pretty]">{step.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-fog-white px-5 py-14 md:py-20 xl:px-10">
        <div className="mx-auto flex max-w-page flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p dir="ltr" className="m-0 font-mono text-micro tracking-[0.08em] text-gray-800">
              {c.values.kicker}
            </p>
            <h2 className="m-0 text-h1 font-bold">{c.values.heading}</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {c.values.items.map((item) => (
              <div key={item.title} className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-6">
                <span className="text-h4 font-h4">{item.title}</span>
                <p className="m-0 text-body leading-[1.7] text-gray-800 [text-wrap:pretty]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-graphite px-5 py-14 text-fog-white md:py-20 xl:px-10">
        <div className="mx-auto flex max-w-page flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="m-0 text-h1 font-bold">{c.workshop.heading}</h2>
            <p className="m-0 max-w-text text-body leading-[1.7] text-silver [text-wrap:pretty]">
              {c.workshop.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {c.workshop.areas.map((area, index) => (
              <div key={area.label} className="flex flex-col gap-2">
                <Image
                  src={`/images/about/workshop-${index + 1}.jpg`}
                  alt={area.imageAlt}
                  width={400}
                  height={400}
                  dark
                  className="aspect-square w-full rounded-lg border border-edge object-cover"
                />
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-titanium">
                  {area.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-fog-white px-5 py-14 md:py-20 xl:px-10">
        <div className="mx-auto flex max-w-page flex-col items-start gap-4 border-t border-gray-100 pt-14 md:pt-20">
          <h2 className="m-0 max-w-[800px] text-h1 font-bold [text-wrap:pretty]">{c.cta.heading}</h2>
          <p className="m-0 max-w-text text-body-large leading-[1.7] text-gray-800 [text-wrap:pretty]">
            {c.cta.subtitle}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/products"
              className="grid h-12 place-items-center rounded-md bg-graphite px-8 text-body font-medium text-fog-white no-underline transition-colors duration-fast hover:bg-ink"
            >
              {c.cta.primaryAction}
            </Link>
            <Link
              to="/catalog"
              className="grid h-12 place-items-center rounded-md border border-silver bg-white px-8 text-body font-medium text-graphite no-underline transition-colors duration-fast hover:border-titanium"
            >
              {c.cta.secondaryAction}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
