import { ReactNode } from "react";
import { cn } from "../lib/cn";

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand" | "info" | "merged";
  className?: string;
}) {
  const toneClassName = {
    neutral: "bg-panel text-low",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-error/15 text-error",
    brand: "bg-brand/15 text-brand",
    info: "bg-info/15 text-info",
    merged: "bg-merged/15 text-merged"
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-base py-half text-xs font-medium", toneClassName, className)}>{children}</span>;
}
