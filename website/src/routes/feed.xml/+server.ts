import { posts } from '$lib/server/posts';
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
export const GET = () =>
  new Response(
    `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Stuff I Said — Wikipedia Brown</title><id>https://wikipediabrown.dev/</id><updated>${posts[0].date}</updated><link href="https://wikipediabrown.dev/feed.xml" rel="self"/><author><name>Wikipedia Brown</name></author>${posts.map((p) => `<entry><title>${escape(p.title)}</title><id>https://wikipediabrown.dev/blog/${p.slug}/</id><link href="https://wikipediabrown.dev/blog/${p.slug}/"/><updated>${p.date}</updated><summary>${escape(p.summary)}</summary></entry>`).join('')}</feed>`,
    { headers: { 'Content-Type': 'application/atom+xml' } },
  );
