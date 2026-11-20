<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  let command = $state('');
  let lines = $state([
    'Wikipedia Brown — 404 shell',
    "The page you wanted moved or never existed. Type 'help'.",
  ]);
  function run(event: SubmitEvent) {
    event.preventDefault();
    const raw = command.trim();
    command = '';
    const [cmd, arg] = raw.toLowerCase().split(/\s+/);
    const routes: Record<string, string> = {
      home: '/',
      about: '/#about',
      work: '/#work',
      now: '/#now',
      blog: '/blog/',
      contact: '/contact/',
      advisory: '/advisory/',
      '~': '/',
    };
    lines = [...lines, `visitor@wikipediabrown:~$ ${raw}`];
    if (cmd === 'clear') {
      lines = [];
      return;
    }
    if (routes[cmd] || (cmd === 'cd' && routes[arg])) {
      location.href = routes[cmd] || routes[arg];
      return;
    }
    const projects: Record<string, string> = {
      napkin: 'https://getnapkin.to',
      spooktacular: 'https://spooktacular.app',
      sfsymbolskit: 'https://sfsymbolskit.com',
    };
    if (cmd === 'open' && projects[arg]) {
      window.open(projects[arg], '_blank', 'noopener');
      return;
    }
    if (cmd === 'gh') {
      window.open('https://github.com/WikipediaBrown', '_blank', 'noopener');
      return;
    }
    const responses: Record<string, string> = {
      help: 'help · ls · cd <page> · open <project> · whoami · gh · joke · coffee · echo · date · clear',
      ls: 'home · about · work · now · blog · contact · advisory\nnapkin · spooktacular · sfsymbolskit',
      whoami: 'Wikipedia Brown — software engineer and objectively funny.',
      joke: 'There are 2 hard problems in CS: cache invalidation, naming things, and off-by-one errors.',
      coffee: '☕ Brewing…',
      sudo: 'nice try.',
      date: new Date().toString(),
    };
    lines = [
      ...lines,
      cmd === 'echo'
        ? raw.slice(5)
        : responses[cmd] || `command not found: ${cmd} — type 'help'`,
    ];
  }
</script>

<div class="term">
  <div class="term__bar">wikipediabrown — 404</div>
  <div class="term__log" role="log" aria-live="polite">
    {#each lines as line}<p class="whitespace-pre-wrap">{line}</p>{/each}
  </div>
  <form onsubmit={run} class="flex gap-2 p-4">
    <label for="terminal-command" class="sr-only">Terminal command</label><Input
      id="terminal-command"
      bind:value={command}
      autocomplete="off"
      spellcheck="false"
      placeholder="Type help"
    /><Button type="submit">Run</Button>
  </form>
</div>
