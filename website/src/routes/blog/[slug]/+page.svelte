<script lang="ts">
  import SEO from '$lib/SEO.svelte';
  import { codeCopy } from '$lib/code-copy';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  let { data } = $props();
  let progress = $state(0);
  onMount(() => {
    const update = () => {
      const d = document.documentElement;
      progress =
        d.scrollHeight > d.clientHeight
          ? d.scrollTop / (d.scrollHeight - d.clientHeight)
          : 0;
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  });
</script>

<SEO
  title={data.post.title}
  description={data.post.summary}
  image={data.post.image}
  path={page.url.pathname}
  article
/>
<div
  class="fixed top-0 left-0 h-0.5 bg-primary z-[60]"
  style={`width:${progress * 100}%`}
  aria-hidden="true"
></div>
<article class="post">
  <header class="post__head">
    <p class="post__kicker"><a href="/blog/">← Stuff I Said</a></p>
    <h1 class="post__title">{data.post.title}</h1>
    <p class="post__summary">{data.post.dek}</p>
    <p class="post__meta">
      {Math.ceil(data.post.words / 200)} min read · {data.post.words} words
    </p>
  </header>
  <div class="post__body" use:codeCopy={data.post.html}>
    {@html data.post.html}
  </div>
  <footer class="post__foot">
    <a href="/blog/" class="post__back">← Back to everything</a>
  </footer>
</article>
