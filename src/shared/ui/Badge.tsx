import { ReactNode } from "react";
import { cn } from "../lib/cn";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "brand" }) {
  return <span className={cn("ui-badge", `ui-badge-${tone}`)}>{children}</span>;
}
