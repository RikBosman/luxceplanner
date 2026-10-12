import { ButtonLink } from "@/components/ui/button";

export function Eyebrow({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={`flex items-center gap-3 font-display text-xs tracking-[0.28em] uppercase ${tone === "dark" ? "text-gold-400" : "text-gold-600"}`}>
      <span aria-hidden="true" className="h-px w-8 bg-current opacity-70" />
      {children}
    </p>
  );
}

export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink-950 text-ivory">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-gold-400/10 blur-3xl" />
      <div className="container-page relative pb-16 pt-16 sm:pt-20">
        {eyebrow && <Eyebrow tone="dark">{eyebrow}</Eyebrow>}
        <h1 className="mt-5 max-w-3xl font-serif text-5xl font-medium leading-[1.05] sm:text-6xl">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ivory/75">{intro}</p>}
        {children}
      </div>
      <div className="gold-rule" />
    </section>
  );
}

export function CtaBand({ title = "Klaar om te beginnen?", text = "Maak gratis een account aan en teken binnen een paar minuten je eerste kamer." }: { title?: string; text?: string }) {
  return (
    <section className="container-page mt-24">
      <div className="relative overflow-hidden rounded-3xl border border-gold-400/30 bg-ink-950 px-8 py-12 text-ivory sm:px-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-4xl font-medium">{title}</h2>
            <p className="mt-3 max-w-xl text-ivory/70">{text}</p>
          </div>
          <ButtonLink href="/registreren" size="lg" className="shrink-0">Gratis beginnen</ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function StatusBadge({ status }: { status: "beschikbaar" | "in-ontwikkeling" | "gepland" }) {
  const map = {
    beschikbaar: ["Beschikbaar", "bg-gold-100 text-gold-800"],
    "in-ontwikkeling": ["In ontwikkeling", "bg-sand-200 text-sand-800"],
    gepland: ["Gepland", "bg-white text-sand-600 border border-sand-300"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
