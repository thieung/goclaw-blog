# Project: GoClaw Blog

Astro monorepo blog platform for GoClaw. Deployed on Vercel.

## Stack
- **Astro** — static site generator, zero JS to client by default
- **pnpm workspaces + Turborepo** — monorepo management
- Each post has its own unique design (fonts, colors, layout) — CSS stays per-post
- Legacy `posts/` folder contains published static HTML (pre-migration)

## Monorepo Structure
```
├── packages/core/           — shared components, i18n utils
├── sites/inside-goclaw/     — Astro site (→ Vercel)
│   └── src/
│       ├── components/      — page-specific Astro components
│       ├── content/         — content collections
│       ├── drafts/          — draft .astro posts
│       ├── i18n/            — translation JSON per post slug
│       ├── layouts/         — base layouts
│       └── pages/           — routes (posts/, admin/, en/, zh/, ja/)
├── posts/                   — published static HTML (legacy)
├── social/                  — social media content per post
├── plans/                   — implementation plans
└── docs/                    — project documentation
```

## Build Commands
```bash
pnpm install
pnpm dev          # start dev server
pnpm build        # production build
```

## Adding a New Post
1. Create `sites/inside-goclaw/src/drafts/<slug>.astro`
2. Add i18n translations in `sites/inside-goclaw/src/i18n/<slug>/`
3. When ready, move to `src/pages/posts/<slug>.astro`
4. Add card entry to `src/pages/index.astro` (newest first)
5. Push — Vercel auto-deploys

## i18n (Multilingual)
Every post MUST support 4 languages: **vi** (default), **en**, **zh**, **ja**.

### How it works (Astro)
- Translation JSON files per post slug in `sites/inside-goclaw/src/i18n/<slug>/`
- Astro injects translations at build time — no runtime JS fetch
- Vietnamese is the default in HTML source
- Locale routes: `/en/posts/<slug>`, `/zh/posts/<slug>`, `/ja/posts/<slug>`

### Legacy posts (posts/*.html)
- HTML elements use `data-i18n="key"` attributes
- Translation object `const T = { vi: {}, en: {...}, zh: {...}, ja: {...} }` in `<script>` block
- `setLang(lang)` replaces innerHTML of `[data-i18n]` elements
- Lang controlled via URL param `?lang=xx`

### Lang button behavior (IMPORTANT)
- Lang buttons on post pages MUST navigate to locale URL (`/en/posts/...`) instead of just calling `setLang()` runtime
- This ensures back-navigation to home preserves the selected language
- Pattern: extract slug from current path, build new locale path, `window.location.href = newPath`
- When editing `posts/*.html`, always sync changes to all 4 Astro locale copies in `sites/inside-goclaw/src/pages/{posts,en/posts,zh/posts,ja/posts}/_<slug>.html`

### What to i18n
- All user-visible text: headings, paragraphs, labels, table headers, table descriptions, callouts, list items, card labels, subtitles, KPI labels, footer text

### What NOT to i18n
- Code blocks and code examples
- Entity type names (person, project, task, etc.)
- Technical identifiers, variable names, API paths
- Mermaid diagram source text

### Key naming convention
Group by section number, use short descriptive names:
```
hero_sub, hero_title
s1_intro, s1_prereq_title, s1_prereq_p1
s2_title, s9_opt8_before
toc_s1, toc_s2
kpi_label_1, kpi_label_2
footer_text
```

### i18n Workflow
- **Source of truth:** HTML file (`drafts/<slug>.html` hoặc `.astro`)
- **i18n JSON:** Derived artifact — manually populated từ HTML source
- **Không có auto-generate** — phải copy text thủ công hoặc dùng LLM translate
- Khi sửa content: sửa HTML source trước, rồi sync sang i18n JSON

### i18n Validation (IMPORTANT)
Run `pnpm validate:i18n` to detect truncated translations.

**Common truncation causes:**
- LLM token limit khi generate translations
- Copy-paste không hết câu
- Context window overflow với file lớn

**Truncation patterns detected:**
- Ends with conjunction: "hoặc", "or", "và", "and", "或", "と"
- Ends with "· Có" / "· With" (incomplete comparison)
- Unclosed HTML tags: `<code>`, `<strong>`, `<em>`
- Ends with comma expecting more content

**Prevention:** Copy FULL text từ HTML source. Verify all 4 langs có cùng structure.

## Project Rules (read on demand)
Lazy-load these only when the task touches the matching area:
- `.claude/rules/post-navigation-and-theme.md` — nav header (home link, theme toggle, lang buttons) conventions for `_<slug>.html` post pages. **Read before editing any post HTML.**

## Social Content
Each post has social media content in `sites/inside-goclaw/assets/social/<slug>/`:
- `facebook-post.txt`, `facebook-comment.txt`
- `x-post.txt`, `threads-post.txt`
- `thumbnail-vi.html`, `thumbnail-en.html` (1200x630 OG images)

## Vietnamese Writing Style (Social Posts)
When writing Vietnamese social posts, translate tech terms to accessible Vietnamese:
- extraction → trích xuất, storage → lưu trữ, visualization → trực quan hóa
- entity → thực thể, relation → quan hệ, confidence scoring → chấm điểm độ tin cậy
- fallback → cơ chế dự phòng, optimizations → cải tiến, memoization → ghi nhớ (add explanation)
- depth traversal → duyệt sâu, max N hops → tối đa N bước nhảy
- Keep as-is: PostgreSQL, pgvector, recursive CTE, KNN, O(1), Map, Three.js, INP
- No double dashes (--), use commas/periods. Use 🔹 for FB list items.
- English posts (X/Twitter) keep original technical terms.

## Icons
- Use **Lucide icons** (inline SVG) instead of emojis for UI elements
- CDN: `https://unpkg.com/lucide-static@latest/icons/`
- Common icons: `terminal`, `code`, `zap`, `check`, `x`, `alert-triangle`, `info`, `arrow-right`, `sparkles`, `brain`, `rocket`

## Future Phases
- Phase 2: Extract `@blog/core` shared package
- Phase 3: Scaffold `sites/inside-openclaw/` (→ Cloudflare)
- Phase 4: Content Collections for markdown-based posts
