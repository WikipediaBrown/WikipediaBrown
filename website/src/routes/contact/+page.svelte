<script>
  import SEO from '$lib/SEO.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
</script>

<SEO
  title="Contact"
  path="/contact/"
  description="Reach Wikipedia Brown or book private AI advisory."
/>
<section class="section contact-page">
  <div class="section__head">
    <span class="section__num">№ 05</span>
    <h1 class="section__title">Say <em>hello</em>.</h1>
    <span class="section__kicker"
      >A project, a problem, or a record I should hear.</span
    >
  </div>
  <div class="flex flex-wrap gap-4">
    <Button href="/advisory/">Book private AI advisory ↗</Button><Button
      href="https://github.com/WikipediaBrown"
      variant="outline">Find me on GitHub ↗</Button
    >
  </div>
</section>
