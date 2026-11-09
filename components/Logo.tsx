/**
 * LOGO PLACEHOLDER — replace with the real ZF Entretien logo.
 * Drop the file in /public (e.g. /public/logo.svg) and swap the <svg> below for
 * <Image src="/logo.svg" alt="ZF Entretien" width={…} height={…} priority />.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="4" fill="var(--color-blue)" />
        <rect x="5" y="5" width="10" height="10" fill="var(--color-glass)" />
        <rect x="17" y="5" width="10" height="10" fill="var(--color-glass)" />
        <rect x="5" y="17" width="10" height="10" fill="var(--color-glass)" />
        <rect x="17" y="17" width="10" height="10" fill="var(--color-glass)" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-ink">
        ZF <span className="font-semibold">Entretien</span>
      </span>
    </span>
  );
}
