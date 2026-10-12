import Link from "next/link";

export default function NotFound() {
  return (
    <main id="inhoud" className="container-page flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-20">
      <p className="text-sm font-medium uppercase tracking-widest text-gold-600">404</p>
      <h1 className="font-serif text-4xl text-sand-900">Deze pagina bestaat niet</h1>
      <p className="text-sand-700">Of je hebt er geen toegang toe. Controleer de link of ga terug.</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-full bg-gold-400 px-5 py-2.5 text-sm font-medium text-ink-950">Naar de homepage</Link>
        <Link href="/app" className="rounded-full border border-sand-300 px-5 py-2.5 text-sm">Mijn ontwerpen</Link>
      </div>
    </main>
  );
}
