<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  let { text }: { text: string } = $props();
  let label = $state('Copy');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      label = 'Copied';
    } catch {
      label = 'Select code to copy';
    }
  }
</script>

<Button
  variant="outline"
  size="sm"
  onclick={copy}
  aria-label="Copy code to clipboard">{label}</Button
>
