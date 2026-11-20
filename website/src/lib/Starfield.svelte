<script>
  import { onMount } from 'svelte';
  import { startStarfield } from './starfield.js';
  let canvas;
  onMount(() => startStarfield(canvas));
</script>

<canvas bind:this={canvas} id="stars" aria-hidden="true"></canvas>
