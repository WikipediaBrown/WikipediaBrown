// wikipediabrown.dev — tiny interactive 404 terminal.
// No deps. User input is only ever written with textContent (no XSS).

(() => {
  const term = document.getElementById('term');
  const log = document.getElementById('term-log');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-input');
  if (!term || !log || !form || !input) return;

  const history = [];
  let hpos = -1;

  const el = (cls, text) => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  };
  const print = (text, cls) => { log.appendChild(el('term__line ' + (cls || ''), text)); };
  const blank = () => log.appendChild(el('term__line', ' '));
  const scroll = () => { log.scrollTop = log.scrollHeight; };

  function printLink(label, href, note) {
    const line = el('term__line');
    const a = document.createElement('a');
    a.href = href; a.textContent = label;
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    line.appendChild(a);
    if (note) { const s = document.createElement('span'); s.textContent = '  — ' + note; s.className = 'term__dim'; line.appendChild(s); }
    log.appendChild(line);
  }

  const go = (href) => { print('→ ' + href, 'term__dim'); setTimeout(() => { location.href = href; }, 220); };

  const JOKES = [
    "There are 2 hard problems in CS: cache invalidation, naming things, and off-by-one errors.",
    "I'd tell you a UDP joke, but you might not get it.",
    "It works on my machine. Shipping my machine.",
    "Stand-up comedy is just code review for jokes.",
    "I don't always test my code, but when I do, I do it in production.",
    "Semaphore walks into a bar. Bartender says: one at a time.",
  ];

  const ROUTES = {
    home: '/', '~': '/', about: '/#about', work: '/#work',
    now: '/#now', blog: '/blog/', contact: '/contact/',
  };
  const PROJECTS = {
    spooktacular: 'https://spooktacular.app/',
    napkin: 'https://getnapkin.to',
    sfsymbolskit: 'https://sfsymbolskit.com',
  };

  const COMMANDS = {
    help() {
      print('available commands:');
      [
        ['help', 'this list'],
        ['ls', 'what’s around here'],
        ['cd <page>', 'home · about · work · now · blog · contact'],
        ['open <project>', 'spooktacular · napkin · sfsymbolskit'],
        ['whoami', 'the short version'],
        ['gh', 'open GitHub'],
        ['joke', 'he is, allegedly, a funny man'],
        ['coffee', '☕'],
        ['clear', 'wipe the screen'],
      ].forEach(([c, d]) => print('  ' + c.padEnd(16) + d));
    },
    ls() {
      print('pages/      about  work  now  blog  contact');
      print('projects/   spooktacular  napkin  sfsymbolskit');
      print("type  cd blog  or  open napkin");
    },
    whoami() {
      print('Wikipedia Brown — software engineer and general funny man.');
      print('Ships code at scale; writes about it; bakes sourdough, badly.');
    },
    cd(arg) {
      const r = ROUTES[(arg || '').toLowerCase()];
      if (r) return go(r);
      print("cd: no such page: " + (arg || '') + "  (try: ls)", 'term__err');
    },
    open(arg) {
      const p = PROJECTS[(arg || '').toLowerCase()];
      if (p) { print('opening ' + arg + ' ↗', 'term__dim'); window.open(p, '_blank', 'noopener'); return; }
      print("open: unknown project: " + (arg || ''), 'term__err');
    },
    gh() { print('github.com/WikipediaBrown ↗', 'term__dim'); window.open('https://github.com/WikipediaBrown', '_blank', 'noopener'); },
    joke() { print(JOKES[Math.floor(Math.random() * JOKES.length)]); },
    coffee() { print('   ( ('); print('    ) )'); print('  ........'); print('  |      |]'); print('  \\      /'); print("   `----'   brewing…"); },
    sudo() { print("nice try.", 'term__err'); },
    echo(arg, raw) { print(raw.replace(/^echo\s?/, '')); },
    date() { print(new Date().toString()); },
    clear() { log.textContent = ''; },
    '404'() {
      print(' _  _    ___  _  _ ');
      print('| || |  / _ \\| || |');
      print('| || |_| | | | || |_');
      print('|__   _| |_| |__   _|');
      print('   |_|  \\___/   |_|   case still open.');
    },
  };

  function run(raw) {
    const line = raw.trim();
    print('visitor@wikipediabrown:~$ ' + raw, 'term__cmd');
    if (!line) return;
    history.unshift(line); hpos = -1;
    const [cmd, ...rest] = line.split(/\s+/);
    const key = cmd.toLowerCase();
    // bare page/project names work too: `blog`, `napkin`
    if (COMMANDS[key]) { COMMANDS[key](rest.join(' '), line); }
    else if (ROUTES[key]) { go(ROUTES[key]); }
    else if (PROJECTS[key]) { COMMANDS.open(key); }
    else { print("command not found: " + cmd + "  — type 'help'", 'term__err'); }
    blank();
  }

  // boot
  print('Wikipedia Brown — 404 shell  (the page you wanted moved or never existed)');
  print("Wikipedia Brown took the case. Type 'help' to look around.", 'term__dim');
  blank();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
    scroll();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hpos < history.length - 1) hpos++;
      input.value = history[hpos] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hpos > 0) { hpos--; input.value = history[hpos] || ''; }
      else { hpos = -1; input.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const p = input.value.trim().toLowerCase();
      if (p) {
        const pool = [...Object.keys(COMMANDS), ...Object.keys(ROUTES), ...Object.keys(PROJECTS)];
        const m = pool.find((c) => c.indexOf(p) === 0);
        if (m) input.value = m;
      }
    }
  });

  term.addEventListener('click', () => input.focus());
  if (!window.matchMedia || !window.matchMedia('(hover: none)').matches) input.focus();
})();
