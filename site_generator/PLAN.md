# Static Site Generator Plan

Goal: Build a professional, modern static website from the Markdown content under `docs/`, with a deterministic build process and clean information architecture.

---

## Objectives
- Professional design (modern typography, spacing, colors, dark mode optional)
- Deterministic builds from source Markdown in `docs/`
- Clear separation of concerns: content (docs) vs. presentation (generator)
- Minimal friction for authors: update Markdown → rebuild → site updates
- Output to `exports/website/` (kept out of Git via .gitignore)

---

## Approach
- Use a Node-based static site generator with a small custom pipeline:
  - Unified/remark/rehype toolchain for Markdown → HTML
  - ESM (Node 18+) + TypeScript for clarity and safety
  - Tailwind CSS (or vanilla CSS tokens) for clean, consistent styling
  - Shiki (or Prism) for code highlighting (if needed)
  - Lunr (or Pagefind) for client-side search
- Keep the generator simple and deterministic: no server, no frameworks required

---

## Project Structure
```
site_generator/
├── package.json
├── tsconfig.json
├── src/
│   ├── build.ts                 # Main build script (or index.ts)
│   ├── content.ts               # Content discovery and routing
│   ├── markdown.ts              # MD → HTML pipeline (remark/rehype)
│   ├── templates/
│   │   ├── layout.html          # Base HTML shell
│   │   ├── page.html            # Generic page template
│   │   ├── section.html         # Section index template
│   │   └── partials/
│   │       ├── head.html
│   │       ├── header.html
│   │       ├── nav.html
│   │       ├── footer.html
│   │       └── breadcrumbs.html
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css         # Tailwind build output or handcrafted CSS
│   │   │   └── tailwind.css     # Tailwind source (if used)
│   │   ├── js/
│   │   │   ├── search.js        # Lunr/Pagefind init
│   │   │   └── ui.js            # Nav, dark mode toggle, etc.
│   │   └── images/
│   └── sitemap.ts               # Sitemap.xml + robots.txt generation
├── tailwind.config.cjs          # If Tailwind is used
├── postcss.config.cjs           # If Tailwind/PostCSS used
└── README.md
```

Output directory (generated):
```
exports/website/
├── index.html
├── teacher-toolkit/
├── grant-toolkit/
├── assets/
└── sitemap.xml
```

---

## Content Mapping (Docs → Site)
- Autodiscover Markdown under `docs/**/*.md`
- Route mapping rules:
  - `docs/teacher_toolkit/README.md` → `/teacher-toolkit/`
  - `docs/grant_toolkit/README.md`   → `/grant-toolkit/`
  - Any `README.md` in a folder becomes that folder’s index
  - Other `.md` files map to kebab-case paths: `symptom_checker.md` → `/teacher-toolkit/symptom-checker/`
- Preserve existing intra-doc links: convert `.md` links to site-relative routes at build
- Generate navigation from folder structure + frontmatter (optional)

---

## Styling & UX (Professional Design)
- Typography: Inter + Source Sans 3 (system fallbacks); sensible type scale
- Spacing: 8px/4px rhythm; generous white space
- Color system: neutral base + accent colors (blue/green) with accessible contrast
- Components: sticky header, collapsible sidebar, breadcrumb, table of contents
- Mobile-first, responsive grid, prefers-color-scheme dark support (optional)
- Print styles for clean PDF printing from browser

---

## Search
- Option A: Lunr index generated at build time (JSON + client search)
- Option B: Pagefind (faster, prebuilt index) if acceptable to include
- Include simple search UI in header with keyboard focus shortcut (`/`)

---

## Build Steps (Deterministic)
1. Clean output dir: `exports/website/`
2. Copy static assets from `site_generator/src/assets/`
3. Compile Tailwind/PostCSS (if used) → `assets/css/main.css`
4. Discover Markdown in `docs/**`
5. Parse and transform Markdown (remark-mdx? → remark → rehype → HTML)
6. Resolve and rewrite internal links from `.md` to final site routes
7. Render with templates (layout + partials)
8. Generate navigation, breadcrumbs, section indexes, and a global index
9. Build search index (Lunr/Pagefind)
10. Emit `sitemap.xml` and `robots.txt`

---

## NPM Scripts (Draft)
- `dev`: watch `docs/**` and `site_generator/src/**`, rebuild on change, serve locally
- `build`: one-shot deterministic build to `exports/website/`
- `clean`: remove `exports/website/`
- `check`: link integrity check for all internal links

---

## Dependencies (Draft)
- Core: `typescript`, `tsx`, `globby`, `fs-extra`, `gray-matter`, `change-case`
- Markdown: `remark`, `remark-gfm`, `remark-frontmatter`, `remark-toc`, `rehype`, `rehype-slug`, `rehype-autolink-headings`, `rehype-raw`, `rehype-format`
- CSS: `tailwindcss`, `postcss`, `autoprefixer` (or handcrafted CSS)
- Code: `shiki` or `prismjs` (optional)
- Search: `lunr` (or `@pagefind/default-ui` if adopting Pagefind)
- Dev: `live-server` or `serve` for local preview

---

## Link Strategy (ABL)
- Rewrite `.md` links to site-relative routes
- Preserve external links; add `rel="noopener"` where appropriate
- Auto-insert cross-links (next/prev, parent/children sections)
- Validate links in `check` script; fail build on broken internals

---

## Accessibility & Performance
- Semantic HTML, ARIA landmarks, accessible color contrast
- Skip links, keyboard navigable menus, focus styles
- Image optimization (static), responsive images where available
- Preload fonts, minimize CLS, bundle only minimal JS

---

## Risks & Mitigations
- Link rewriting complexity → implement robust path resolver + tests
- CSS bloat with Tailwind → use JIT + content purging; or handcrafted CSS
- Search index size → scope to headings + paragraphs; consider Pagefind
- Content drift → deterministic mapping; no content changes in generator

---

## Acceptance Criteria
- Build produces a visually polished, accessible website in `exports/website/`
- All internal links resolve; `check` reports 0 broken links
- Navigation is intuitive; users can find docs within 3 clicks
- Mobile and desktop render cleanly; print styles are legible
- Rebuilds are deterministic; same input → same output

---

## GitHub Pages Integration (Automatic Deployment)
- **Goal**: Push changes to `docs/**/*.md` → automatic build → live site on GitHub Pages
- **Approach**: GitHub Actions workflow that:
  1. Triggers on push to main branch (or specific paths: `docs/**`, `site_generator/**`)
  2. Checks out repo, sets up Node.js, installs dependencies
  3. Runs `npm run build` in `site_generator/`
  4. Deploys `exports/website/` to GitHub Pages (gh-pages branch or Pages source)
- **Workflow file**: `.github/workflows/deploy.yml`
- **Benefits**: Zero-friction publishing; just edit markdown and push
- **Fallback**: Manual `npm run build` + `npm run deploy` for local testing

## Next Steps (do not execute yet)
1. Initialize Node project in `site_generator/` (TypeScript, ESM)
2. Add baseline templates and CSS (high-quality, modern styling)
3. Implement Markdown discovery and routing
4. Implement Markdown → HTML pipeline with link rewriting
5. Implement templates rendering and navigation generation
6. Add search indexing and UI
7. Add sitemap/robots generation
8. Add `dev`, `build`, `check`, `deploy` scripts
9. Add `.gitignore` rule to exclude `exports/website/`
10. Create GitHub Actions workflow for automatic deployment
11. Configure GitHub Pages settings (source: GitHub Actions)
12. Review visual design; iterate on typography/spacing/colors

