import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
  className?: string;
}

export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const baseId = useId();

  return (
    <div className={cn("overflow-hidden rounded-md border border-gray-100", className)}>
      {items.map((item, index) => {
        const isOpen = item.id === openId;
        return (
          <div key={item.id} className={cn(index < items.length - 1 && "border-b border-gray-100")}>
            <button
              type="button"
              id={`${baseId}-btn-${item.id}`}
              aria-expanded={isOpen}
              aria-controls={`${baseId}-panel-${item.id}`}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 border-0 bg-white px-6 py-5 text-start text-body font-medium hover:bg-fog-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              <span>{item.title}</span>
              <span dir="ltr" aria-hidden="true" className="font-mono text-small text-gray-800">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <div
              id={`${baseId}-panel-${item.id}`}
              role="region"
              aria-labelledby={`${baseId}-btn-${item.id}`}
              hidden={!isOpen}
            >
              <p className="m-0 max-w-text px-6 pb-5 text-body leading-normal text-gray-800">
                {item.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
