import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "icon";
}

export function Button({ children, icon, className, variant = "secondary", ...props }: ButtonProps) {
  const variantClassName = {
    primary: "border-brand bg-brand text-on-brand hover:bg-brand-hover disabled:border-border disabled:bg-panel disabled:text-low",
    secondary: "border-border bg-secondary text-normal hover:border-brand hover:text-high disabled:text-low",
    ghost: "border-transparent bg-transparent text-low hover:bg-panel hover:text-normal disabled:text-low",
    icon: "h-8 w-8 justify-center border-border bg-secondary p-0 text-low hover:border-brand hover:text-high disabled:text-low"
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex min-h-8 items-center gap-base rounded-sm border px-double py-base text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50",
        variantClassName,
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
