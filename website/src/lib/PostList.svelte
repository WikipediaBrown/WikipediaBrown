<script lang="ts">
  import * as Card from '$lib/components/ui/card/index.js';
  let { posts }: { posts: { slug: string; title: string; summary: string }[] } =
    $props();
</script>

<ol class="posts">
  {#each posts as post}<li class="posts__item">
      <Card.Root
        ><a class="posts__link" href={`/blog/${post.slug}/`}>{post.title}</a>
        <p class="posts__summary">{post.summary}</p></Card.Root
      >
    </li>{/each}
</ol>
