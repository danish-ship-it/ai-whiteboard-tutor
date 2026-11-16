import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-action text-on-action hover:bg-action-hover active:bg-action-pressed disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)]",
  secondary: "border border-control bg-surface text-fg hover:bg-raised disabled:text-[var(--disabled-text)]",
  ghost: "text-fg hover:bg-raised disabled:text-[var(--disabled-text)]",
  danger: "border border-danger bg-danger-bg text-danger hover:brightness-95",
};

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold leading-5 transition-colors duration-[120ms] ease-ui disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ label, className = "", ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors duration-[120ms] ease-ui hover:bg-raised disabled:cursor-not-allowed disabled:text-[var(--disabled-text)] disabled:hover:bg-transparent ${className}`}
      {...props}
    />
  );
}
