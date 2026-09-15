import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    return (
      <label className="block">
        {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}
        <input
          ref={ref}
          id={id}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
            error ? "border-rose-400" : "border-ink-200"
          } ${className}`}
          {...rest}
        />
        {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
      </label>
    );
  },
);
Input.displayName = "Input";
