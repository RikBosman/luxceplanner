import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const routes = ["", "/functies", "/hoe-het-werkt", "/prijzen", "/inspiratie", "/veelgestelde-vragen", "/contact", "/privacy", "/voorwaarden", "/registreren", "/inloggen"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((r) => ({
    url: `${siteConfig.url}${r}`,
    changeFrequency: "monthly",
    priority: r === "" ? 1 : r === "/registreren" || r === "/functies" ? 0.8 : 0.5,
  }));
}
