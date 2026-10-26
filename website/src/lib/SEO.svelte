<script lang="ts">
  let {
    title = 'Software Engineer',
    description = 'Wikipedia Brown — software engineer. Apple Silicon, Swift, distributed systems, and AI.',
    path = '/',
    image = '/og.png',
    article = false,
  } = $props();
  const url = $derived(`https://wikipediabrown.dev${path}`);
  const schema = $derived({
    '@context': 'https://schema.org',
    '@type': article ? 'BlogPosting' : 'WebPage',
    name: title,
    description,
    url,
    image: `https://wikipediabrown.dev${image}`,
    author: {
      '@type': 'Person',
      name: 'Wikipedia Brown',
      url: 'https://wikipediabrown.dev/',
    },
  });
  const fullTitle = $derived(`${title} — Wikipedia Brown`);
</script>

<svelte:head
  >{@html `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`}<title
    >{fullTitle}</title
  ><meta name="description" content={description} /><link
    rel="canonical"
    href={url}
  /><meta property="og:title" content={fullTitle} /><meta
    property="og:description"
    content={description}
  /><meta property="og:type" content={article ? 'article' : 'website'} /><meta
    property="og:url"
    content={url}
  /><meta
    property="og:image"
    content={`https://wikipediabrown.dev${image}`}
  /><meta name="twitter:card" content="summary_large_image" /><meta
    name="theme-color"
    content="#0B0C0E"
  /><link
    rel="alternate"
    type="application/atom+xml"
    href="/feed.xml"
    title="Stuff I Said"
  /></svelte:head
>
