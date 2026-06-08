import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
