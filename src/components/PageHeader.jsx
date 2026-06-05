import { Badge } from "@/components/ui/badge";

export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <Badge variant="default" className="mb-1 uppercase tracking-[0.14em]">
            {eyebrow}
          </Badge>
        )}
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
