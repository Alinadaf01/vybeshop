import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toJalaali } from "jalaali-js";
import { categories } from "@/data/categories";
import { getSiteSettings } from "@/lib/api";
import { VybeWordmark } from "@/components/brand/VybeWordmark";

const quickLinks = [
  { label: "محصولات", href: "/products" },
  { label: "کاتالوگ", href: "/catalog" },
  { label: "بلاگ", href: "/blog" },
  { label: "درباره ما", href: "/about" },
];

const supportLinks: { label: string; href?: string }[] = [
  { label: "پیگیری سفارش" },
  { label: "ارسال و تحویل" },
  { label: "مرجوعی" },
  { label: "نگهداری قطعات", href: "/blog/blog-3" },
  { label: "سؤالات متداول" },
];

const aboutLinks: { label: string; href?: string }[] = [
  { label: "کارگاه", href: "/about" },
  { label: "فرایند تولید", href: "/blog/blog-12" },
  { label: "همکاری با ما", href: "/contact" },
  { label: "تماس با ما", href: "/contact" },
];

const jalaliYear = toJalaali(new Date()).jy;

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-small font-semibold text-white">{title}</span>
      {children}
    </div>
  );
}

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribed(true);
  }

  return (
    <footer className="bg-graphite px-5 py-14 text-fog-white md:py-20 xl:px-10">
      <div className="mx-auto max-w-page">
        <div className="flex flex-col items-center gap-2 border-b border-edge pb-12 text-center">
          <VybeWordmark className="h-8 w-auto p-1" />
          <p className="mt-2 text-body-large text-silver">طراحی‌شده برای ارتقای روزمرگی.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 border-b border-edge py-12 md:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="دسته‌بندی‌ها">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="text-small text-silver no-underline hover:text-white"
              >
                {category.name}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="لینک‌های سریع">
            {quickLinks.map((link) => (
              <Link key={link.href} to={link.href} className="text-small text-silver no-underline hover:text-white">
                {link.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="پشتیبانی و راهنما">
            {supportLinks.map((link) =>
              link.href ? (
                <Link key={link.label} to={link.href} className="text-small text-silver no-underline hover:text-white">
                  {link.label}
                </Link>
              ) : (
                <span key={link.label} className="text-small text-silver">
                  {link.label}
                </span>
              ),
            )}
          </FooterColumn>

          <FooterColumn title="درباره VYBE">
            {aboutLinks.map((link) =>
              link.href ? (
                <Link key={link.label} to={link.href} className="text-small text-silver no-underline hover:text-white">
                  {link.label}
                </Link>
              ) : (
                <span key={link.label} className="text-small text-silver">
                  {link.label}
                </span>
              ),
            )}
          </FooterColumn>
        </div>

        <div className="flex flex-wrap justify-between gap-8 pt-12">
          <div className="flex max-w-[420px] flex-col gap-3">
            <span className="text-small font-semibold">خبرنامه</span>
            <p className="m-0 text-small leading-[1.6] text-titanium">ماهی یک ایمیل. محصول تازه و یادداشت‌های کارگاه.</p>
            {subscribed ? (
              <p className="m-0 text-small text-success-dark">عضو شدید. ممنون!</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="ایمیل شما"
                  className="h-12 flex-1 rounded-md border border-edge bg-surface px-4 text-small text-fog-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                />
                <button
                  type="submit"
                  className="h-12 rounded-md border-0 bg-white px-6 text-small font-medium text-graphite hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                >
                  عضویت
                </button>
              </form>
            )}
          </div>

          {settings && (
            <div className="flex flex-col gap-4">
              <div dir="ltr" className="flex gap-4 font-mono text-micro text-silver">
                {settings.socialLinks.map((link) => (
                  <a key={link.platform} href={link.url} className="text-silver no-underline hover:text-white">
                    {link.platform}
                  </a>
                ))}
              </div>
              <div className="flex gap-3">
                <div
                  dir="ltr"
                  className="grid h-[72px] w-[72px] place-items-center rounded-md border border-edge px-1 text-center font-mono text-micro leading-[1.4] text-titanium"
                >
                  {settings.trustBadgeLabel}
                </div>
                <div
                  dir="ltr"
                  className="grid h-[72px] w-[72px] place-items-center rounded-md border border-edge px-1 text-center font-mono text-micro leading-[1.4] text-titanium"
                >
                  {settings.paymentGatewayLabel}
                </div>
              </div>
            </div>
          )}
        </div>

        <p dir="ltr" className="m-0 mt-12 font-mono text-micro tracking-[0.06em] text-titanium">
          &copy; {jalaliYear} VYBE &middot; ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}
