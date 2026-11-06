import matter from 'gray-matter';
import { marked } from 'marked';
import { codeToHtml } from 'shiki';
const source = import.meta.glob('../../../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
export const posts = await Promise.all(
  Object.entries(source).map(async ([path, raw]) => {
    const { data, content } = matter(raw);
    const slug = path
      .split('/')
      .pop()!
      .replace(/^\d{4}-\d{2}-\d{2}-/, '')
      .replace(/\.md$/, '');
    const html = await marked.parse(content, { async: true, hooks: undefined });
    const highlighted = await Promise.all(
      [
        ...html.matchAll(
          /<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
        ),
      ].map(async (match) => {
        const decoded = match[2]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
        try {
          return [
            match[0],
            await codeToHtml(decoded, {
              lang: match[1] || 'text',
              theme: 'github-dark',
            }),
          ];
        } catch {
          return [match[0], match[0]];
        }
      }),
    );
    let output = html;
    for (const [before, after] of highlighted)
      output = output.replace(before, after);
    return {
      slug,
      title: String(data.title),
      summary: String(data.summary || ''),
      dek: String(data.dek || data.summary || ''),
      image: String(data.image || '/og.png'),
      imageAlt: String(data.image_alt || data.title),
      date: new Date(data.date).toISOString(),
      html: output,
      words: content.split(/\s+/).length,
    };
  }),
);
posts.sort((a, b) => b.date.localeCompare(a.date));
