import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTabId, className }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowRight") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const next = tabs[nextIndex];
      setActiveId(next.id);
      tabRefs.current[next.id]?.focus();
    }
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-6 border-b border-gray-100">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "border-0 border-b-2 bg-transparent py-4 text-body font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                selected ? "border-cyan text-graphite" : "border-transparent text-gray-800 hover:text-graphite",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="max-w-text py-6 text-body leading-normal text-gray-800"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
