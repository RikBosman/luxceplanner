import Image from "next/image";
import type { SampleDesign } from "@/domain/project";

/**
 * Fotorealistische 3D-render van een voorbeeldontwerp (public/renders/<slug>.jpg), gemaakt met de
 * path-tracing-renderer uit de studio op basis van hetzelfde ontwerpbestand. Opnieuw maken: pnpm render:samples.
 */
export function SampleRenderImage({ sample, className = "", priority = false, sizes = "(min-width: 1024px) 50vw, 100vw" }: { sample: SampleDesign; className?: string; priority?: boolean; sizes?: string }) {
  return (
    <Image
      src={`/renders/${sample.slug}.jpg`}
      alt={`3D-render: ${sample.title}`}
      width={1600}
      height={1000}
      sizes={sizes}
      priority={priority}
      className={`h-auto w-full object-cover ${className}`}
    />
  );
}
