import { ReactNode } from "react";
import { cn } from "../lib/cn";

type PanelSurface = "primary" | "secondary" | "auxiliary";

export function Panel({
  children,
  className,
  surface = "secondary"
}: {
  children: ReactNode;
  className?: string;
  surface?: PanelSurface;
}) {
  const surfaceClassName = {
    primary: "border-brand/30 bg-panel",
    secondary: "border-border bg-secondary",
    auxiliary: "border-border bg-primary"
  }[surface];
  return (
    <section data-panel-surface={surface} className={cn("min-w-0 overflow-hidden rounded-sm border p-triple text-normal", surfaceClassName, className)}>
      {children}
    </section>
  );
}
