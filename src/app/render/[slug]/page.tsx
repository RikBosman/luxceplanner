import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SampleRenderClient } from "./client";
import { SAMPLE_DESIGNS } from "@/domain/project";

export const metadata: Metadata = { title: "Render", robots: { index: false, follow: false } };

/** Alleen tijdens ontwikkeling (of met RUIMTE_RENDER=1) beschikbaar; bedoeld voor scripts/render-samples.mjs. */
function renderingAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.RUIMTE_RENDER === "1";
}

export default async function RenderPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (!renderingAllowed()) notFound();
  const { slug } = await params;
  const sp = await searchParams;
  const num = (v: string | undefined, d: number, max: number) => Math.min(max, Math.max(1, Number(v) || d));
  const sample = SAMPLE_DESIGNS.find((s) => s.slug === slug);
  if (!sample) notFound();
  return <SampleRenderClient slug={sample.slug} width={num(sp.w, 1600, 3840)} height={num(sp.h, 1000, 2160)} samples={num(sp.samples, 256, 4096)} />;
}
