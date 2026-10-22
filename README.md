# Nektarios Zabouris — Online CV

Live at https://geofeid.github.io/zab-cv/

`index.html` is the only source. On screen it is the online CV; its `@media print`
styles are the A4 sheet that becomes the PDF behind "Download CV".

```bash
node build.mjs   # writes Nektarios_Zabouris_CV.pdf with headless Chrome
```

The build fails if the PDF is not exactly 2 pages (page 2 starts at Projects), so
content that outgrows page 1 is caught before it ships. Fonts are self-hosted so
the PDF renders the same locally and in CI.

Pushing to `main` runs `.github/workflows/deploy.yml`: build the PDF, deploy to
GitHub Pages (Settings → Pages → Source: GitHub Actions, once). The PDF is never
committed, so the download always matches the page.
