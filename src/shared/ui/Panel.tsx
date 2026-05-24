import { ReactNode } from "react";
import { cn } from "../lib/cn";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-sm border border-border bg-secondary p-triple text-normal", className)}>{children}</section>;
}
