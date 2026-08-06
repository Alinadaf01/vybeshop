export interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="mx-auto flex max-w-page flex-col items-center gap-4 px-5 py-20 text-center xl:px-10">
      <span dir="ltr" className="font-mono text-caption tracking-[0.08em] text-gray-800">
        IN PROGRESS
      </span>
      <h1 className="m-0 text-h2 font-semibold">{title}</h1>
      <p className="m-0 max-w-text text-body text-gray-800">
        این صفحه هنوز آماده نشده — منتظر فایل طراحی مربوطه هستیم.
      </p>
    </div>
  );
}
