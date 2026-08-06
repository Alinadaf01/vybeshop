import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-page flex-col items-center gap-6 px-5 py-20 text-center xl:px-10">
      <span dir="ltr" className="font-mono text-display font-extrabold text-silver">
        404
      </span>
      <h1 className="m-0 text-h2 font-semibold">این صفحه پیدا نشد</h1>
      <p className="m-0 max-w-text text-body text-gray-800">
        ممکن است آدرس اشتباه باشد یا صفحه جابه‌جا شده باشد.
      </p>
      <Link to="/">
        <Button variant="primary">بازگشت به خانه</Button>
      </Link>
    </div>
  );
}
