"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="inhoud" className="container-page flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-20">
      <h1 className="font-serif text-3xl text-sand-900">Er ging iets mis</h1>
      <p className="text-sand-700">Probeer het opnieuw. Blijft het misgaan, neem dan contact met ons op.</p>
      <button onClick={reset} className="rounded-full bg-moss-600 px-5 py-2.5 text-sm font-medium text-white">Opnieuw proberen</button>
    </main>
  );
}
