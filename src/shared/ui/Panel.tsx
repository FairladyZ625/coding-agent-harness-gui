import { ReactNode } from "react";
import { cn } from "../lib/cn";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("ui-panel", className)}>{children}</section>;
}
