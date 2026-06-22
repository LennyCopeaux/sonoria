import type { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({
  active = false,
  className = "",
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-primary text-white shadow-lg shadow-primary/25"
          : "bg-surface-2 text-muted ring-1 ring-line hover:text-white hover:bg-surface-3"
      } ${className}`}
      {...props}
    />
  );
}
