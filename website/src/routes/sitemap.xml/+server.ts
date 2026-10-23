import { posts } from '$lib/server/posts';
export const GET = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/contact/', '/advisory/', '/blog/', ...posts.map((p) => `/blog/${p.slug}/`)].map((path) => `<url><loc>https://wikipediabrown.dev${path}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
