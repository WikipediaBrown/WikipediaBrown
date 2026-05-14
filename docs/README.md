# wikipediabrown.dev

The source for [wikipediabrown.dev](https://wikipediabrown.dev) — a Jekyll site
hosted on GitHub Pages.

## Local preview

The repo includes a small Jekyll site under this `docs/` directory. To run it
locally:

```sh
cd docs
bundle exec jekyll serve   # or: jekyll serve
# then open http://localhost:4000
```

If you don't have a `Gemfile`, the bare `jekyll` command (Ruby gem) works too,
since the site only uses GitHub Pages' default plugin allowlist.

## Deployment

GitHub Pages serves this site from the `main` branch's `/docs` folder. Push to
`main` and the site rebuilds within a minute or two.

**Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: `main` · folder `/docs`**

The custom domain `wikipediabrown.dev` is configured via the `CNAME` file at
`docs/CNAME`. DNS records needed on the registrar:

| Type  | Host | Value                       |
|-------|------|-----------------------------|
| A     | @    | 185.199.108.153             |
| A     | @    | 185.199.109.153             |
| A     | @    | 185.199.110.153             |
| A     | @    | 185.199.111.153             |
| CNAME | www  | wikipediabrown.github.io.   |

Check **"Enforce HTTPS"** in Pages settings once the certificate provisions.

## Stack

- Jekyll (GitHub Pages safe-plugins allowlist: `jekyll-feed`, `jekyll-sitemap`,
  `jekyll-seo-tag`)
- Recursive variable font (pinned `MONO=1 CASL=0` — Mono Linear)
- A small vanilla JS file (hamburger toggle + marquee pause + static ASCII
  Mac mini painter)

## Repository layout

```
docs/
  _config.yml         ← site config
  _layouts/           ← default + post layouts
  _includes/          ← head, nav, footer partials
  _posts/             ← blog posts (Markdown, YYYY-MM-DD-slug.md)
  _tools/             ← Python image-to-ASCII pipeline
  blog/index.html     ← blog index page
  css/main.css        ← all styles
  js/main.js          ← tiny progressive enhancement
  img/                ← portfolio thumbnails
  index.html          ← homepage
  CNAME               ← custom domain
  favicon.svg
```

## Editing

Most homepage content lives in [`docs/index.html`](./index.html). Blog posts
live in [`docs/_posts/`](./_posts/) — front-matter `layout: post`, filename
`YYYY-MM-DD-slug.md`. The `/now` section on the homepage is intended for
seasonal updates.
