"use client";

import dynamic from "next/dynamic";
import { SAMPLE_DESIGNS } from "@/domain/project";

const PhotoRender = dynamic(() => import("@/components/three/photo-render").then((m) => m.PhotoRender), { ssr: false });

export function SampleRenderClient({ slug, width, height, samples }: { slug: string; width: number; height: number; samples: number }) {
  const sample = SAMPLE_DESIGNS.find((s) => s.slug === slug)!;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <PhotoRender document={sample.document} camera={sample.camera} width={width} height={height} samples={samples} />
    </div>
  );
}
