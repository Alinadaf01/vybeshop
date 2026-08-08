import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="مسیر ناوبری" className="flex flex-wrap items-center gap-2 py-6 text-small text-gray-800">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link to={item.href} className="text-gray-800 no-underline hover:text-graphite">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className="text-graphite">
                {item.label}
              </span>
            )}
            {!isLast && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
