import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "icon";
}

export function Button({ children, icon, className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button className={cn("ui-button", `ui-button-${variant}`, className)} {...props}>
      {icon}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
