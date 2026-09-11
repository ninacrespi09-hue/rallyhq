import { Badge } from "@/components/ui/badge";

export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <Badge variant="outline" className="mb-1.5 border-border text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-500">
            {eyebrow}
          </Badge>
        )}
        <h1 className="mt-0.5 text-2xl font-semibold text-navy-900 sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
