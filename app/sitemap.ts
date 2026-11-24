import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://ai.jessiecalm.com/', changeFrequency: 'monthly', priority: 1 }]
}
