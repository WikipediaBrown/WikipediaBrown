<script>
  import PostList from '$lib/PostList.svelte';
  import SEO from '$lib/SEO.svelte';
  let { data } = $props();
</script>

<SEO
  title="Stuff I Said"
  path="/blog/"
  description="Writing on software, Apple platforms, AI, and adjacent obsessions."
/>
<section class="section blog-index">
  <div class="section__head">
    <span class="section__num">№ 04</span>
    <h1 class="section__title">Stuff I <em>Said</em></h1>
    <span class="section__kicker"
      >Software, Apple platforms, AI, and adjacent obsessions.</span
    >
  </div>
  <PostList posts={data.posts} />
</section>
