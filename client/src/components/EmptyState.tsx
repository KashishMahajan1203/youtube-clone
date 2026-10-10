import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-surface/50 px-6 py-16 text-center">
      <div className="relative mb-5">
        <div className="bg-gradient-brand absolute inset-0 rounded-2xl opacity-30 blur-xl" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-2">
          <Icon className="size-7 text-white/80" />
        </div>
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
