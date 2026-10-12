import type { ComponentProps } from "react";

export function Field({
  label,
  name,
  error,
  hint,
  ...input
}: ComponentProps<"input"> & { label: string; name: string; error?: string; hint?: string }) {
  const id = input.id ?? `veld-${name}`;
  const describedBy = [error ? `${id}-fout` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-sand-800">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="block w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sand-900 shadow-sm placeholder:text-sand-400 focus:border-moss-500 aria-[invalid=true]:border-clay-500"
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-sand-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-fout`} className="text-sm text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-clay-500/40 bg-clay-500/10 text-clay-600",
    success: "border-moss-400/50 bg-moss-50 text-moss-800",
    info: "border-sand-300 bg-sand-100 text-sand-800",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}
