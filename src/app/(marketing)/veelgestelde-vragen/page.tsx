import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/marketing/sections";
import { FAQ } from "@/content/faq";

export const metadata: Metadata = {
  title: "Veelgestelde vragen",
  description: "Antwoorden op veelgestelde vragen over ontwerpen, maten, opslag, prijzen en privacy.",
  alternates: { canonical: "/veelgestelde-vragen" },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <PageHero eyebrow="Hulp" title="Veelgestelde vragen" />
      <div className="container-page max-w-3xl">
        <dl className="divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
          {FAQ.map((f) => (
            <div key={f.q} className="p-6">
              <dt className="font-semibold text-sand-900">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-sand-700">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sand-700">Staat je vraag er niet bij? <Link href="/contact" className="text-moss-700 underline underline-offset-4">Neem contact op</Link>.</p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <CtaBand />
    </>
  );
}
