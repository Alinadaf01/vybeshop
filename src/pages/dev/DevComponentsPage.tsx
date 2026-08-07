import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Radio } from "@/components/ui/Radio";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { Card } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Pagination } from "@/components/ui/Pagination";
import { Accordion } from "@/components/ui/Accordion";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Lightbox } from "@/components/ui/Lightbox";
import { ToastItem } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PriceRangeSlider } from "@/components/ui/PriceRangeSlider";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Rating } from "@/components/ui/Rating";
import { SpecTable } from "@/components/product/SpecTable";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { formatPrice } from "@/lib/formatters";

function Section({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <p dir="ltr" className="m-0 font-mono text-caption tracking-[0.08em] text-gray-800">
        {kicker}
      </p>
      <h2 className="m-0 text-h3 font-semibold">{title}</h2>
      {description && <p className="m-0 max-w-text text-small leading-[1.6] text-gray-800">{description}</p>}
      {children}
    </section>
  );
}

function Box({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-6 rounded-lg border border-gray-100 bg-white p-8", className)}>
      {children}
    </div>
  );
}

function Cell({ label, onDark, children }: { label: string; onDark?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span
        dir="ltr"
        className={cn("font-mono text-micro tracking-[0.08em]", onDark ? "text-titanium" : "text-gray-800")}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

export function DevComponentsPage() {
  const [inputValue, setInputValue] = useState("سارا احمدی");
  const [checkboxOn, setCheckboxOn] = useState(true);
  const [radioValue, setRadioValue] = useState("standard");
  const [switchOn, setSwitchOn] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number]>([223000, 1057000]);
  const [quantity, setQuantity] = useState(2);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedTag, setSelectedTag] = useState(true);

  const colors = [
    { name: "مشکی مات", hex: "#101012" },
    { name: "سفید یخی", hex: "#F2F2F0" },
    { name: "نقره‌ای", hex: "#C4C8CD" },
    { name: "خاکستری تیتانیوم", hex: "#8A8D92" },
  ];

  return (
    <div className="min-h-screen bg-fog-white font-peyda text-body text-graphite antialiased">
      <header className="bg-graphite px-5 py-14 text-fog-white md:py-20 xl:px-10">
        <div className="mx-auto max-w-page">
          <p dir="ltr" className="m-0 mb-6 font-mono text-caption tracking-[0.08em] text-titanium">
            DEV &middot; COMPONENTS
          </p>
          <h1 className="m-0 text-display font-extrabold">کتابخانه کامپوننت‌ها</h1>
          <p className="m-0 mt-6 max-w-text text-body-large text-silver">
            نمونهٔ زنده هر کامپوننت با تمام حالت‌ها. حالت‌های تعاملی (هاور، فوکوس، اکتیو) را با موس و کیبورد روی
            نمونهٔ پیش‌فرض امتحان کنید؛ بقیهٔ حالت‌ها (غیرفعال، بارگذاری، خطا) نمونهٔ جدا دارند.
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-page flex-col gap-14 px-5 py-14 md:gap-20 md:py-20 xl:px-10">
        <Section kicker="BUTTON" title="دکمه">
          <Box>
            <Cell label="PRIMARY">
              <Button variant="primary">مجموعه را کاوش کنید</Button>
            </Cell>
            <Cell label="PRIMARY · DISABLED">
              <Button variant="primary" disabled>
                مجموعه را کاوش کنید
              </Button>
            </Cell>
            <Cell label="PRIMARY · LOADING">
              <Button variant="primary" loading>
                در حال ارسال
              </Button>
            </Cell>
            <Cell label="PRIMARY · ERROR">
              <Button variant="primary" error>
                دوباره تلاش کنید
              </Button>
            </Cell>
            <Cell label="SECONDARY">
              <Button variant="secondary">افزودن به سبد</Button>
            </Cell>
            <Cell label="SECONDARY · DISABLED">
              <Button variant="secondary" disabled>
                ناموجود
              </Button>
            </Cell>
            <Cell label="SECONDARY · LOADING">
              <Button variant="secondary" loading>
                افزودن…
              </Button>
            </Cell>
            <Cell label="SECONDARY · ERROR">
              <Button variant="secondary" error>
                موجودی کافی نیست
              </Button>
            </Cell>
            <Cell label="TEXT">
              <Button variant="text">جزئیات را ببینید</Button>
            </Cell>
            <Cell label="TEXT · DISABLED">
              <Button variant="text" disabled>
                جزئیات را ببینید
              </Button>
            </Cell>
            <Cell label="TEXT · ERROR">
              <Button variant="text" error>
                لینک در دسترس نیست
              </Button>
            </Cell>
          </Box>
        </Section>

        <Section kicker="ICON BUTTON" title="دکمه آیکون">
          <Box className="bg-graphite">
            <Cell label="OUTLINE" onDark>
              <IconButton aria-label="جستجو">S</IconButton>
            </Cell>
            <Cell label="OUTLINE · SM" onDark>
              <IconButton aria-label="بستن" size="sm">
                &#10005;
              </IconButton>
            </Cell>
            <Cell label="OUTLINE · DISABLED" onDark>
              <IconButton aria-label="جستجو" disabled>
                S
              </IconButton>
            </Cell>
          </Box>
        </Section>

        <Section kicker="TEXT INPUT · TEXTAREA · SELECT" title="ورودی‌ها">
          <Box className="md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            <Cell label="DEFAULT">
              <Input
                label="نام و نام خانوادگی"
                placeholder="مثلاً سارا احمدی"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </Cell>
            <Cell label="DISABLED">
              <Input label="نام و نام خانوادگی" disabled placeholder="غیرفعال" />
            </Cell>
            <Cell label="LOADING">
              <Input label="کد پستی" loading defaultValue="در حال بررسی…" readOnly />
            </Cell>
            <Cell label="ERROR">
              <Input label="ایمیل" defaultValue="sara@" error="ایمیل معتبر نیست." />
            </Cell>
            <Cell label="SUCCESS">
              <Input label="ایمیل" defaultValue="sara@vybe.ir" success="تأیید شد." />
            </Cell>
            <Cell label="TEXTAREA">
              <Textarea label="پیام" placeholder="پیام شما" />
            </Cell>
            <Cell label="TEXTAREA · ERROR">
              <Textarea label="پیام" defaultValue="کوتاه" error="حداقل ۲۰ نویسه لازم است." />
            </Cell>
            <Cell label="SELECT">
              <Select label="مرتب‌سازی" defaultValue="newest">
                <option value="newest">جدیدترین</option>
                <option value="cheap">ارزان‌ترین</option>
                <option value="expensive">گران‌ترین</option>
              </Select>
            </Cell>
            <Cell label="SELECT · DISABLED">
              <Select label="مرتب‌سازی" disabled defaultValue="newest">
                <option value="newest">جدیدترین</option>
              </Select>
            </Cell>
          </Box>
        </Section>

        <Section kicker="CHECKBOX · RADIO · SWITCH · STEPPER · RATING" title="کنترل‌های انتخاب">
          <Box className="md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Cell label="CHECKBOX">
              <div className="flex flex-col gap-3">
                <Checkbox label="فقط کالاهای موجود" checked={checkboxOn} onChange={(e) => setCheckboxOn(e.target.checked)} />
                <Checkbox label="غیرفعال" disabled />
                <Checkbox label="پذیرش شرایط لازم است" error />
              </div>
            </Cell>
            <Cell label="RADIO">
              <div className="flex flex-col gap-3">
                <Radio
                  name="shipping"
                  label="ارسال عادی"
                  checked={radioValue === "standard"}
                  onChange={() => setRadioValue("standard")}
                />
                <Radio
                  name="shipping"
                  label="ارسال پیشتاز"
                  checked={radioValue === "express"}
                  onChange={() => setRadioValue("express")}
                />
                <Radio name="shipping" label="تحویل حضوری (غیرفعال)" disabled />
              </div>
            </Cell>
            <Cell label="SWITCH">
              <div className="flex flex-col gap-3">
                <Switch label={switchOn ? "روشن" : "خاموش"} checked={switchOn} onChange={(e) => setSwitchOn(e.target.checked)} />
                <Switch label="غیرفعال" disabled />
              </div>
            </Cell>
            <Cell label="STEPPER · RATING">
              <div className="flex flex-col gap-3">
                <QuantityStepper value={quantity} onChange={setQuantity} />
                <QuantityStepper value={1} onChange={() => {}} disabled />
                <Rating value={4.2} count={18} />
              </div>
            </Cell>
          </Box>
        </Section>

        <Section kicker="BADGE · TAG · SWATCH · PRICE RANGE" title="بج، تگ، سواچ، بازه قیمت">
          <Box className="flex-col">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="solid">NEW</Badge>
              <Badge variant="subtle">PLA</Badge>
              <Badge variant="success">موجود</Badge>
              <Badge variant="neutral">ناموجود</Badge>
              <Badge variant="danger">آخرین موجودی</Badge>
              <Tag onRemove={() => setSelectedTag(false)}>میز کار</Tag>
              {selectedTag && (
                <Tag selected onRemove={() => setSelectedTag(false)}>
                  مشکی مات
                </Tag>
              )}
            </div>
            <div className="flex flex-wrap gap-8">
              <div className="flex flex-col gap-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  COLOR SWATCH
                </span>
                <div className="flex gap-3">
                  {colors.map((color, index) => (
                    <ColorSwatch
                      key={color.name}
                      hex={color.hex}
                      name={color.name}
                      selected={selectedColor === index}
                      onClick={() => setSelectedColor(index)}
                    />
                  ))}
                  <ColorSwatch hex="#C8BFAE" name="بژ" outOfStock />
                </div>
              </div>
              <div className="flex min-w-[280px] flex-1 flex-col gap-3">
                <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                  PRICE RANGE SLIDER
                </span>
                <PriceRangeSlider min={0} max={2000000} value={priceRange} onChange={setPriceRange} formatValue={formatPrice} />
              </div>
            </div>
          </Box>
        </Section>

        <Section kicker="BREADCRUMB · PAGINATION · TABS · ACCORDION" title="ناوبری و افشا">
          <Box className="flex-col">
            <Breadcrumb
              items={[
                { label: "خانه", href: "/" },
                { label: "محصولات", href: "/products" },
                { label: "VYBE Stand Air" },
              ]}
            />
            <Pagination page={page} pageCount={9} onPageChange={setPage} />
            <Tabs
              tabs={[
                {
                  id: "specs",
                  label: "مشخصات فنی",
                  content: (
                    <span>
                      ابعاد <span dir="ltr" className="font-mono">90 × 60 × 45 mm</span> &middot; وزن{" "}
                      <span dir="ltr" className="font-mono">78 g</span>
                    </span>
                  ),
                },
                { id: "care", label: "نگهداری", content: "با پارچه نرم و آب سرد تمیز شود." },
                { id: "shipping", label: "ارسال", content: "ارسال از تهران، آماده‌سازی یک روز کاری." },
              ]}
            />
            <Accordion
              items={[
                { id: "q1", title: "قطعات چاپ سه‌بعدی دوام دارند؟", content: "PLA برای کاربرد روزمره در دمای اتاق پایدار است." },
                { id: "q2", title: "رنگ سفارشی می‌گیرید؟", content: "برای سفارش‌های بالای ده عدد بله." },
              ]}
              defaultOpenId="q1"
            />
          </Box>
        </Section>

        <Section kicker="CARD" title="کارت پایه">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card interactive className="p-4">
              <span className="text-h4 font-h4">DEFAULT · INTERACTIVE</span>
            </Card>
            <Card className="p-4">
              <Skeleton className="mb-2 h-4 w-4/5" />
              <Skeleton className="mb-2 h-3.5 w-3/5" />
              <Skeleton className="h-3.5 w-2/5" />
            </Card>
            <Card className="p-6">
              <SpecTable
                rows={[
                  { label: "ابعاد", value: "90 × 60 × 45 mm" },
                  { label: "وزن", value: "78 g" },
                  { label: "متریال", value: "پلی‌کربنات" },
                  { label: "SKU", value: "VYBE-STA-001" },
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section kicker="FILE DOWNLOAD BUTTON" title="دکمه دانلود فایل">
          <div className="grid grid-cols-1 gap-6 rounded-lg bg-graphite p-8 md:grid-cols-2 lg:grid-cols-4">
            <DownloadButton
              status="idle"
              href="/catalog/vybe-catalog.pdf"
              fileName="vybe-catalog.pdf"
              meta={
                <span dir="ltr" className="font-mono text-micro leading-[1.6] text-titanium">
                  PDF &middot; 8.4 MB &middot; 32 صفحه
                </span>
              }
            />
            <DownloadButton status="preparing" href="#" fileName="vybe-catalog.pdf" meta={<span dir="ltr" className="font-mono text-micro text-titanium">PROGRESS 62%</span>} />
            <DownloadButton status="done" href="/catalog/vybe-catalog.pdf" fileName="vybe-catalog.pdf" meta={<span dir="ltr" className="font-mono text-micro text-titanium">SAVED</span>} />
            <DownloadButton status="error" href="#" fileName="vybe-catalog.pdf" meta={<span dir="ltr" className="font-mono text-micro text-danger-dark">ERR_NETWORK</span>} />
          </div>
        </Section>

        <Section kicker="MODAL · DRAWER · LIGHTBOX · TOAST" title="اورلی‌ها">
          <Box>
            <Cell label="MODAL">
              <Button onClick={() => setModalOpen(true)}>باز کردن مودال</Button>
              <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="حذف از سبد؟">
                <span className="text-h4 font-h4">حذف از سبد؟</span>
                <p className="m-0 text-body leading-normal text-gray-800">VYBE Stand Air از سبد شما حذف می‌شود.</p>
                <div className="flex gap-2">
                  <Button variant="primary" className="flex-1" onClick={() => setModalOpen(false)}>
                    حذف
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
                    انصراف
                  </Button>
                </div>
              </Modal>
            </Cell>
            <Cell label="DRAWER">
              <Button onClick={() => setDrawerOpen(true)}>باز کردن فیلترها</Button>
              <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="فیلترها">
                <div className="flex flex-col gap-3">
                  <span className="text-body">دسته‌بندی</span>
                  <span className="text-small text-gray-800">بازه قیمت</span>
                  <span className="text-small text-gray-800">رنگ</span>
                </div>
                <Button variant="primary" className="mt-auto" onClick={() => setDrawerOpen(false)}>
                  نمایش نتایج
                </Button>
              </Drawer>
            </Cell>
            <Cell label="LIGHTBOX">
              <Button
                onClick={() => {
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}
              >
                باز کردن گالری
              </Button>
              <Lightbox
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                images={["/images/products/vybe-stand-air/1.jpg", "/images/products/vybe-stand-air/2.jpg"]}
                index={lightboxIndex}
                onIndexChange={setLightboxIndex}
                title="VYBE Stand Air"
              />
            </Cell>
            <Cell label="TOAST">
              <div className="flex w-full flex-col gap-3">
                <ToastItem variant="success" message="به سبد اضافه شد." action={{ label: "مشاهده سبد", onClick: () => {} }} />
                <ToastItem variant="danger" message="ارسال فرم ناموفق بود." action={{ label: "تلاش دوباره", onClick: () => {} }} />
                <ToastItem variant="warning" message="فقط ۲ عدد در انبار مانده." />
              </div>
            </Cell>
          </Box>
        </Section>

        <Section kicker="LIST STATES" title="حالت‌های لیست" description="پر · در حال بارگذاری · خالی · خطا — برای هر گرید و لیست سایت.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-6">
              <span dir="ltr" className="font-mono text-micro tracking-[0.08em] text-gray-800">
                SKELETON
              </span>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-[60px] w-12 shrink-0" />
                  <span className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-2/5" />
                  </span>
                </div>
              ))}
            </div>
            <EmptyState
              title="نتیجه‌ای نبود"
              description="فیلترها را ساده‌تر کنید یا همه محصولات را ببینید."
              action={<Button variant="secondary">حذف فیلترها</Button>}
            />
            <ErrorState
              title="بارگذاری انجام نشد"
              description="اتصال قطع شد. یک بار دیگر تلاش کنید."
              errorCode="ERR_FETCH_PRODUCTS"
              action={<Button variant="secondary">تلاش دوباره</Button>}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
