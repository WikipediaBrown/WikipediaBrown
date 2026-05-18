# wikipediabrown.dev

The source for [wikipediabrown.dev](https://wikipediabrown.dev) — a Jekyll site
hosted on GitHub Pages, served from this `docs/` directory.

(The repo-root `README.md` is the GitHub *profile* readme; this file is just
developer notes for the site and is excluded from the build.)

## Local preview

```sh
cd docs
bundle exec jekyll serve   # or: jekyll serve
# then open http://localhost:4000
```

GitHub Pages' default plugin allowlist is all that's needed, so the bare
`jekyll` gem works without a `Gemfile`.

## Deployment

GitHub Pages serves from the `main` branch's `/docs` folder. Push to `main`
and the site rebuilds within a minute or two.

**Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: `main` · folder `/docs`**

The custom domain `wikipediabrown.dev` is set via `docs/CNAME`. DNS:

| Type  | Host | Value                       |
|-------|------|-----------------------------|
| A     | @    | 185.199.108.153             |
| A     | @    | 185.199.109.153             |
| A     | @    | 185.199.110.153             |
| A     | @    | 185.199.111.153             |
| CNAME | www  | wikipediabrown.github.io.   |

Enable **"Enforce HTTPS"** in Pages settings once the certificate provisions.

## Stack

- Jekyll (GitHub Pages safe plugins: `jekyll-feed`, `jekyll-sitemap`,
  `jekyll-seo-tag`).
- Fonts: Bricolage Grotesque (display) + Hanken Grotesk (body) + Recursive
  in mono mode (code/labels), via Google Fonts.
- Mobile-first CSS in `css/main.css` (base = phone; `@media (min-width: …)`
  enhances up). One dark theme, mint accent.
- Vanilla JS, no build step:
  - `js/main.js` — mobile-nav hamburger, code-block "terminal window" +
    copy button, live GitHub stat tiles (GitHub public API).
  - `js/stars.js` — parallax starfield canvas (shooting stars + satellite).
  - `js/term.js` — the interactive 404 terminal.
- `og.png` / `apple-touch-icon.png` / `favicon.svg` are committed assets;
  cache-busted via a `?v=N` query in `_includes/head.html` / `_layouts`.
- `github-metrics.svg` (repo root) is regenerated daily by
  `.github/workflows/metrics.yml` and embedded in the profile readme.

## Repository layout

```
docs/
  _config.yml          ← site config
  _layouts/            ← default + post
  _includes/           ← head, nav, footer partials
  _posts/              ← blog posts (YYYY-MM-DD-slug.md)
  blog/index.html      ← blog index
  contact/index.html   ← contact page
  css/main.css         ← all styles (mobile-first)
  js/                  ← main.js, stars.js, term.js
  index.html           ← homepage
  404.html             ← interactive terminal 404
  llms.txt             ← machine-readable site map for AI agents
  robots.txt           ← crawler rules + sitemap pointer
  og.png, apple-touch-icon.png, favicon.svg
  CNAME                ← custom domain
```

## Editing

Homepage content lives in [`docs/index.html`](./index.html). Blog posts go in
[`docs/_posts/`](./_posts/) with front-matter `layout: post` and filename
`YYYY-MM-DD-slug.md`. The `/now` section of the homepage is for seasonal
updates. Bump the `?v=N` asset version in `_includes/head.html` and the
layouts whenever `main.css`/the JS changes, so browsers fetch the new files.
