<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import Menu from '@lucide/svelte/icons/menu';
  let open = $state(false);
  const links = [
    { href: '/#about', label: 'About' },
    { href: '/#work', label: 'Work' },
    { href: '/#now', label: 'Now' },
    { href: '/blog/', label: 'Blog' },
    { href: '/contact/', label: 'Contact' },
    { href: '/advisory/', label: 'AI Advisory' },
  ];
</script>

<header class="masthead">
  <nav class="nav" aria-label="Primary">
    <a class="nav__brand" href="/"
      ><span class="nav__brand-mark">[ wb ]</span><span class="nav__brand-name"
        >wikipediabrown.dev</span
      ></a
    >
    <div class="hidden lg:flex gap-5 text-sm">
      {#each links as link}<a href={link.href}>{link.label}</a>{/each}
    </div>
    <div class="lg:hidden">
      <Sheet.Root bind:open
        ><Sheet.Trigger
          ><Menu size={22} /><span class="sr-only">Open navigation</span
          ></Sheet.Trigger
        ><Sheet.Content
          ><Sheet.Header
            ><Sheet.Title>Explore</Sheet.Title><Sheet.Description
              >Wikipedia Brown</Sheet.Description
            ></Sheet.Header
          >
          <nav class="flex flex-col gap-3 p-6" aria-label="Mobile">
            {#each links as link}<Button
                href={link.href}
                variant="ghost"
                onclick={() => (open = false)}>{link.label}</Button
              >{/each}
          </nav></Sheet.Content
        ></Sheet.Root
      >
    </div>
  </nav>
</header>
