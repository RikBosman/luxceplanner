import { ButtonLink } from "@/components/ui/button";

export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="container-page pb-10 pt-16 sm:pt-20">
      {eyebrow && <p className="text-sm font-medium uppercase tracking-widest text-moss-600">{eyebrow}</p>}
      <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-sand-900 sm:text-5xl">{title}</h1>
      {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand-700">{intro}</p>}
      {children}
    </section>
  );
}

export function CtaBand({ title = "Klaar om te beginnen?", text = "Maak gratis een account aan en teken binnen een paar minuten je eerste kamer." }: { title?: string; text?: string }) {
  return (
    <section className="container-page mt-20">
      <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-moss-700 px-8 py-10 text-white sm:flex-row sm:items-center sm:px-12">
        <div>
          <h2 className="font-serif text-3xl">{title}</h2>
          <p className="mt-2 max-w-xl text-moss-100">{text}</p>
        </div>
        <ButtonLink href="/registreren" variant="secondary" size="lg" className="shrink-0">Gratis beginnen</ButtonLink>
      </div>
    </section>
  );
}

export function StatusBadge({ status }: { status: "beschikbaar" | "in-ontwikkeling" | "gepland" }) {
  const map = {
    beschikbaar: ["Beschikbaar", "bg-moss-100 text-moss-800"],
    "in-ontwikkeling": ["In ontwikkeling", "bg-sand-200 text-sand-800"],
    gepland: ["Gepland", "bg-white text-sand-600 border border-sand-300"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
