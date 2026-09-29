# DATXY

A static resource directory for datasets, models, GPU, CPU, websites and URL tools.

## Local preview

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`. The site uses no build step and can be hosted on GitHub Pages. `CNAME` points to `datxy.com`; configure GitHub Pages and domain DNS separately.

## Edit links

Add featured resources to `curated.json` with `category`, `title`, `desc`, `url` and optional `featured: true`. Existing entries in `list.json` are also loaded and grouped automatically. URLs must use HTTP or HTTPS. Cards open in a new tab. Categories, search and sorting are handled in `app.js`.
