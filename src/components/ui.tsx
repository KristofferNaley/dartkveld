import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "touch-pad inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";
const variants = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  secondary: "bg-panel-2 text-white border border-line hover:bg-line",
  ghost: "text-muted hover:text-white hover:bg-panel-2",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4", lg: "h-14 px-6 text-lg" };

type Style = { variant?: keyof typeof variants; size?: keyof typeof sizes };

export function buttonClass({ variant = "primary", size = "md" }: Style = {}, extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant, size, className = "", ...props }: ComponentProps<"button"> & Style) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function LinkButton({ variant, size, className = "", ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold sm:text-3xl">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-bg px-4 text-base text-white placeholder:text-muted/70 focus:border-accent focus:outline-none";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger" role="alert">{children}</p>;
}
