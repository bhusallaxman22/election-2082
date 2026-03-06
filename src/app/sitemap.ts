import type { MetadataRoute } from "next";
import { parties } from "@/data/parties";
import { provinces } from "@/data/provinces";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://election.bhusallaxman.com.np";

function partyRouteSlug(shortName: string): string {
  return shortName.toLowerCase().replace(/[\s()]/g, "-");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/results`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${siteUrl}/candidates`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/parties`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${siteUrl}/provinces`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  const partyPages: MetadataRoute.Sitemap = parties.map((party) => ({
    url: `${siteUrl}/parties/${partyRouteSlug(party.shortName)}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.75,
  }));

  const provincePages: MetadataRoute.Sitemap = provinces.map((province) => ({
    url: `${siteUrl}/provinces/${province.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...partyPages, ...provincePages];
}
