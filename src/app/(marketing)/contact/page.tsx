import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/sections";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Neem contact op met ${siteConfig.name} voor vragen, feedback of ondersteuning.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Vragen of feedback?" intro="We horen graag wat je van de ontwerpstudio vindt en wat je mist. Stuur ons een e-mail; we reageren meestal binnen twee werkdagen." />
      <div className="container-page">
        <div className="max-w-xl rounded-2xl border border-sand-200 bg-white p-6">
          <h2 className="font-semibold text-sand-900">E-mail</h2>
          <p className="mt-2">
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-lg text-gold-700 underline underline-offset-4">{siteConfig.contactEmail}</a>
          </p>
          <p className="mt-4 text-sm text-sand-600">
            Stuur geen wachtwoorden of andere gevoelige gegevens per e-mail. Gaat je vraag over een specifiek ontwerp, noem dan de naam van het ontwerp.
          </p>
        </div>
      </div>
    </>
  );
}
