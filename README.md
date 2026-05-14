# PerrisDavis.com

Personal site for Perris Davis — software engineer.

Static HTML / CSS / a small JS file. Hosted on **GitHub Pages** at
[perrisdavis.com](https://perrisdavis.com), served from this repo's
[`/docs`](./docs) directory.

## Local preview

```sh
cd docs
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

GitHub Pages is configured to serve from `master` branch, `/docs` folder.
Push to `master` and the site is live within a minute or two.

To set this up in GitHub:
**Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: `master` / `/docs`**.

The custom domain is configured via the `CNAME` file at `docs/CNAME`. The DNS
records you need on your domain registrar are:

| Type  | Host | Value                       |
|-------|------|-----------------------------|
| A     | @    | 185.199.108.153             |
| A     | @    | 185.199.109.153             |
| A     | @    | 185.199.110.153             |
| A     | @    | 185.199.111.153             |
| CNAME | www  | wikipediabrown.github.io.   |

Then check **"Enforce HTTPS"** in Pages settings once the certificate provisions
(usually within an hour after DNS resolves).

## Stack

- Plain HTML5 + CSS (no framework, no build step)
- Type: Fraunces · Newsreader · JetBrains Mono (Google Fonts)
- A single vanilla JS file for reveal-on-scroll and the year stamp

## Editing

Most content lives in [`docs/index.html`](./docs/index.html). The `/now` section
(№ 03) is meant to be updated every season or so — last-revised date is in the
section kicker.

## Repository layout

```
docs/
  index.html        ← all page markup
  css/main.css      ← all styles
  js/main.js        ← tiny progressive enhancement
  img/              ← portfolio thumbnails
  CNAME             ← custom domain (perrisdavis.com)
  .nojekyll         ← skip Jekyll processing
```

