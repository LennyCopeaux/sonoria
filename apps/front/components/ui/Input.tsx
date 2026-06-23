import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`h-11 rounded-xl border border-line bg-surface-2 px-4 text-sm text-white placeholder:text-muted-2 transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      />
      {error ? <p className="text-xs text-primary-soft">{error}</p> : null}
    </div>
  );
}
