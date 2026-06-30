import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-3 text-muted",
  primary: "bg-primary/15 text-primary-soft ring-1 ring-primary/20",
  success: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
};

export function Badge({
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
