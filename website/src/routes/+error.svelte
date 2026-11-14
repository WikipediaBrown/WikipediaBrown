<script>
  import { page } from '$app/state';
  import Terminal from '$lib/Terminal.svelte';
</script>

<svelte:head
  ><title>{page.status} — Case Unsolved — Wikipedia Brown</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<section class="section notfound">
  <div class="section__head">
    <span class="section__num">№ {page.status}</span>
    <h1 class="section__title">Case <em>unsolved.</em></h1>
    <span class="section__kicker"
      >That page isn't in the file. Type help to look around.</span
    >
  </div>
  <Terminal />
</section>
