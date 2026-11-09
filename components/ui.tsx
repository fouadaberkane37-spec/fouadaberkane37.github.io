import type { ButtonHTMLAttributes } from "react";

/** Shared control styles. Tap targets are at least 56 px tall. */
export const buttonStyles = {
  primary:
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-blue px-6 text-lg font-semibold text-white transition-colors hover:bg-blue-deep active:bg-blue-deep disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 border-line bg-paper px-5 text-lg font-semibold text-ink transition-colors hover:border-blue disabled:cursor-not-allowed disabled:opacity-50",
  inverse:
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-paper px-6 text-lg font-semibold text-blue transition-colors hover:bg-glass disabled:cursor-not-allowed disabled:opacity-60",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return <button type="button" {...props} className={`${buttonStyles[variant]} ${className}`} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-5 animate-spin rounded-full border-[3px] border-current border-r-transparent motion-reduce:animate-none ${className}`}
    />
  );
}

export function Alert({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} role="alert" className="rounded-[var(--radius-control)] border-l-4 border-danger bg-danger-soft px-4 py-3 font-medium text-danger">
      {children}
    </div>
  );
}
