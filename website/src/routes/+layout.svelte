<script>
  import '$lib/theme.css';
  import '$lib/editorial.css';
  import Navigation from '$lib/Navigation.svelte';
  import Footer from '$lib/Footer.svelte';
  import Starfield from '$lib/Starfield.svelte';
  let { children } = $props();
</script>

<svelte:head
  ><link rel="preconnect" href="https://fonts.googleapis.com" /><link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  /><link
    href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=Recursive:MONO@1&display=swap"
    rel="stylesheet"
  /></svelte:head
>
<Starfield /><a class="skip" href="#main">Skip to content</a><Navigation />
<main id="main">{@render children()}</main>
<Footer />
