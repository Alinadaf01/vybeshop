export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecTableProps {
  rows: SpecRow[];
}

export function SpecTable({ rows }: SpecTableProps) {
  return (
    <dl className="m-0 flex flex-col">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`flex justify-between gap-4 py-3 ${index < rows.length - 1 ? "border-b border-gray-100" : ""}`}
        >
          <dt className="text-small text-gray-800">{row.label}</dt>
          <dd dir="ltr" className="m-0 font-mono text-small">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
