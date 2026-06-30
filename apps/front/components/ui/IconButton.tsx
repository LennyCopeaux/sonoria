import type { ButtonHTMLAttributes } from "react";

type IconButtonVariant = "surface" | "ghost" | "primary";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
}

const variantClasses: Record<IconButtonVariant, string> = {
  surface:
    "bg-surface-2 text-muted ring-1 ring-line hover:text-white hover:bg-surface-3",
  ghost: "text-muted hover:text-white hover:bg-surface-2",
  primary:
    "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-soft",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function IconButton({
  variant = "ghost",
  size = "md",
  active = false,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "text-primary" : ""
      } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
