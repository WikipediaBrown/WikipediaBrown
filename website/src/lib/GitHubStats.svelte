<script lang="ts">
  import { onMount } from 'svelte';
  let stats = $state<Record<string, number> | null>(null);
  onMount(() => {
    const controller = new AbortController();
    const get = async (path: string) => {
      const response = await fetch(`https://api.github.com/${path}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Unavailable');
      return response.json();
    };
    Promise.all([
      get('users/WikipediaBrown'),
      get('users/WikipediaBrown/repos?per_page=100&type=owner'),
    ])
      .then(([u, repos]) => {
        stats = {
          'Public repos': u.public_repos,
          'Total stars': repos.reduce(
            (sum: number, r: { stargazers_count: number }) =>
              sum + r.stargazers_count,
            0,
          ),
          Followers: u.followers,
          Gists: u.public_gists,
        };
      })
      .catch(() => {});
    return () => controller.abort();
  });
</script>

<dl class="ghstats" aria-label="GitHub activity">
  {#each ['Public repos', 'Total stars', 'Followers', 'Gists'] as label}<div
      class="ghstats__tile"
    >
      <dd class="ghstats__num">{stats?.[label]?.toLocaleString() ?? '—'}</dd>
      <dt>{label}</dt>
    </div>{/each}
</dl>
