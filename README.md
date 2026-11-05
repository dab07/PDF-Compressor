# ShrinkFast 📄⚡
### 100% Client-Side PDF Compressor

A lightning-fast, zero-cloud PDF compression web application built with **Next.js 15+ (App Router)**, **TypeScript (strict)**, and **Tailwind CSS**. 

**Your files never leave your device.** All compression happens entirely in the browser using multi-threaded Web Workers, `pdf-lib`, and `fflate`.

---

## Features
- **100% Client-Side & Private**: No backend, no servers, no database, no uploads.
- **Dedicated Web Worker**: Heavy stream deflating runs on background threads so the UI never freezes or stutters.
- **Compression Presets**:
  - **Low**: Max 300 DPI, high quality (0.85)
  - **Medium (Recommended)**: 150 DPI, balanced (0.70)
  - **High**: 96 DPI, maximum size reduction (0.50)
  - **Extreme**: Full page rasterization
- **Smart Anti-Bloat Protection**: If the output is larger than or equal to the original, the app returns the original file and shows **"Already optimized"**.
- **Security & Limits**:
  - Validates raw `%PDF` magic bytes (rejects fake files)
  - Desktop limit: 100 MB | Mobile limit: 30 MB
  - Graceful detection of password-protected / encrypted PDFs
- **Batch Processing**: Upload up to 10 files at once with individual progress indicators.
- **ZIP Download**: Download single files or bundle everything into a clean ZIP using `fflate` (AGPL-free).
- **Target-Size Landing Pages**:
  - `/compress-pdf-to-100kb/`
  - `/compress-pdf-to-1mb/`
  - `/compress-pdf-for-email/`
- **Mobile-First & Dark Mode**: Responsive touch targets and one-click dark mode toggle.
- **SEO Ready**: `sitemap.xml`, `robots.txt`, and Open Graph metadata.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test # or npx vitest run

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Free Cloudflare Pages Deployment

This project uses Next.js Static HTML Export (`output: 'export'`) in `next.config.ts`, generating a pure static build in the `out/` directory.

### Deploying via Git (Recommended)
1. Push this repository to your GitHub account (`git push origin main`).
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the repository `dab07/PDF-Compressor`.
4. Configure Build Settings:
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
5. Click **Save and Deploy**. Your website will be live globally on Cloudflare's edge network for free with HTTPS.

---

## Automated Tests
Unit tests verify magic bytes parsing, encrypted PDF handling, object streams optimization, and anti-bloat logic:
```bash
npx vitest run
```
