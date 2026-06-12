---
name: thieung:blog
description: Unified blog workflow — topic research, markdown drafts, visual HTML, i18n, and social content generation for GoClaw and ClaudeKit projects.
user_invocable: true
command: /thieung:blog
arguments: "--topic TOPIC --project PROJECT | --review SLUG | --reword SLUG | --preview SLUG | --visual SLUG | --i18n SLUG | --social SLUG | --status | --version VERSION | --scan | --publish SLUG"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
  - Agent
  - Skill
---

# Unified Blog Workflow

End-to-end workflow from topic research to published Astro blog post with social content.

## Project Scout Paths

```
# GoClaw
GOCLAW_SRC=~/projects/contribution/clawfamily/goclaw
GOCLAW_DOCS=~/projects/contribution/clawfamily/goclaw/docs

# ClaudeKit
CLAUDEKIT_SRC=~/projects/contribution/ck-engineer
CLAUDEKIT_DOCS=~/projects/contribution/ck-engineer/claude
```

## Monorepo Paths

```
# GoClaw Site
GOCLAW_SITE=sites/inside-goclaw
GOCLAW_RAW=$GOCLAW_SITE/assets/raw/           # Markdown drafts
GOCLAW_DRAFTS=$GOCLAW_SITE/src/drafts/        # Visual .astro drafts
GOCLAW_PAGES=$GOCLAW_SITE/src/pages/posts/    # Published posts (vi default)
GOCLAW_I18N=$GOCLAW_SITE/src/i18n/            # Translation JSON
GOCLAW_SOCIAL=$GOCLAW_SITE/assets/social/     # Social content + thumbnails

# ClaudeKit Site (scaffold when needed)
CK_SITE=sites/inside-claudekit
CK_RAW=$CK_SITE/assets/raw/
CK_DRAFTS=$CK_SITE/src/drafts/
CK_PAGES=$CK_SITE/src/pages/posts/
CK_I18N=$CK_SITE/src/i18n/
CK_SOCIAL=$CK_SITE/assets/social/
CK_PUBLIC=$CK_SITE/public/
```

## Commands

```bash
# New workflow flags
/thieung:blog --topic "description" --project goclaw|claudekit   # Step 1-2: Scout + Draft .md
/thieung:blog --review <slug>                                     # Step 2.5: Run parallel reviews only
/thieung:blog --reword <slug>                                     # Step 2.6: Reword/polish markdown via /codex:rescue
/thieung:blog --preview <slug>                                    # Step 2.75: Preview gallery + standalone mockups (direction selection)
/thieung:blog --visual <slug>                                     # Step 3: .md → visual .astro
/thieung:blog --i18n <slug>                                       # Step 4: Translations + social
/thieung:blog --social <slug>                                     # Regenerate social only
/thieung:blog --status                                            # Pipeline state

# Legacy support (GoClaw releases)
/thieung:blog --version vX.Y.Z [--pr URL]                         # Full release analysis flow
/thieung:blog --scan                                              # Scan for uncovered releases
/thieung:blog --publish <slug>                                    # Move draft → pages, commit, push
```

## Workflow Steps

### Step 1: Scout Topic (`--topic "..." --project X`)

**Agent:** `researcher` or `Explore`

1. Parse `--project` to determine scout paths:
   - `goclaw`: Focus on `$GOCLAW_DOCS/` (markdown docs 00-24)
   - `claudekit`: Focus on `$CLAUDEKIT_DOCS/skills/` folder
2. Search for relevant code patterns, features, recent changes
3. Save research notes to `plans/reports/scout-{date}-{slug}.md`
4. Proceed to Step 2 automatically

### Step 2: Draft Article (auto after Step 1)

**IMPORTANT — Writing style:** BEFORE drafting, read `.claude/skills/blog-workflow/references/writing-style.md` to internalize the author's voice. This file is the source of truth for tone, vocabulary, opener patterns, pitfall avoidance (no AI-slop phrases, no em-dashes in FB, no generic rhetorical questions). Every draft MUST follow these rules — especially:
- Problem-first opener (no "Trong thời đại..." generic intros)
- Section 9 rules for **INSIDE CLAUDEKIT** series (numbered sections, tables, impersonal tone, "Inside" section for internals)
- Forbidden phrases list (Section 8) — scan draft against it before finishing
- Real-world use cases required (per author preference) — each feature section should have concrete scenario examples

1. Read 2-3 recent published posts for style reference:
   ```bash
   ls $SITE/src/pages/posts/*.astro | head -3
   ```
2. Generate markdown draft covering:
   - Problem statement (lead with pain, not definition)
   - How it works (technical)
   - Architecture/flow
   - **Use cases thực tế** (author pref: abstract explanation without concrete scenarios is NOT acceptable)
   - Best practices + pitfalls (author pref: new-user guidance is required)
   - Technical summary
3. Save to `$RAW/<slug>.md` with frontmatter:
   ```yaml
   ---
   title: "Post Title"
   project: goclaw|claudekit
   version: vX.Y.Z (optional)
   status: draft|approved
   created: YYYY-MM-DD
   ---
   ```
4. Print: "Draft saved. Running parallel review..."
5. Proceed to Step 2.5 automatically

### Step 2.5: Draft Review (auto after Step 2)

Spawn 2 sub-agents in parallel to review the draft:

#### Sub-agent 1: Fact Checker

**Purpose:** Verify all technical claims in draft against actual codebase.

**Process:**
1. Read draft from `$RAW/<slug>.md`
2. For each technical claim/fact:
   - Search target codebase for matching code
   - Verify function names, struct fields, logic flow
   - Check if described behavior matches implementation
3. Output report with format:
   ```
   ## Fact Check Report

   ### ✓ Verified
   - "Feature X uses Y" → found in src/handler/x.go:45

   ### ✗ Mismatch
   - Draft: "Config uses `maxRetries` field"
     Code: Actually uses `retryLimit` (src/config.go:23)

   ### ⚠ Unverified
   - "Performance improved by 30%" → no benchmark found
   ```
4. Save to `plans/reports/factcheck-{date}-{slug}.md`

#### Sub-agent 2: Adversarial Review

**Purpose:** Get alternative perspective from different model via Codex.

**Process:**
1. Trigger `/codex:adversarial-review` skill (requires `codex-plugin-cc`)
2. Pass draft content + target codebase path
3. Codex reviews for:
   - Technical accuracy
   - Missing context
   - Potential misunderstandings
   - Alternative interpretations
4. Output report with same format as Fact Checker
5. Save to `plans/reports/adversarial-{date}-{slug}.md`

#### After Both Reviews Complete

1. Main agent consolidates findings
2. Display summary to user:
   ```
   Draft Review Complete
   ─────────────────────
   Fact Check: 8 verified, 2 mismatches, 1 unverified
   Adversarial: 3 concerns raised

   See reports:
   - plans/reports/factcheck-260412-{slug}.md
   - plans/reports/adversarial-260412-{slug}.md
   ```
3. User reviews reports and either:
   - **Approve:** Update frontmatter `status: approved`, proceed to Step 2.6
   - **Refine:** Request corrections, main agent updates draft, re-run reviews

### Step 2.6: Reword Draft (`--reword <slug>`)

**Purpose:** Polish wording của markdown draft bằng `/codex:rescue` — khai thác model khác (GPT-5.4 qua Codex) để rewording vì nó cho góc nhìn ngôn ngữ khác Claude, ít AI-slop hơn ở tiếng Việt long-form.

**When to run:** Sau khi draft đã `status: approved` qua Step 2.5, TRƯỚC khi `--preview` hoặc `--visual`. Nếu user thấy wording đã ổn (đặc biệt với draft ngắn / release note), có thể skip thẳng sang Step 2.75.

**Process:**

1. Read approved `$RAW/<slug>.md` (verify `status: approved` ở frontmatter)
2. Read `.claude/skills/blog-workflow/references/writing-style.md` để có context về voice/tone constraints
3. Invoke `/codex:rescue` skill với prompt rewording (xem template bên dưới)
4. Codex rescue subagent sẽ:
   - Đọc draft + writing-style reference
   - Reword in-place giữ nguyên cấu trúc (headings, code blocks, frontmatter, link, table, image path KHÔNG đổi)
   - Áp dụng forbidden phrases list (Section 8 của writing-style.md)
   - Giữ technical accuracy — KHÔNG đổi fact, số liệu, tên function/struct/file path
5. Save reworded version trực tiếp vào `$RAW/<slug>.md` (overwrite — git tracking đủ rồi)
6. Print diff summary: số câu được đổi, ví dụ 2-3 thay đổi tiêu biểu
7. User review diff (`git diff $RAW/<slug>.md`):
   - **Accept full:** Proceed to Step 2.75 (`--preview`). Done.
   - **Reject full:** `git checkout -- $RAW/<slug>.md` revert hoàn toàn, rồi chạy lại `--reword` với feedback bổ sung cho Codex (qua `/codex:rescue`).
   - **Accept một phần:** User chỉ thẳng câu/đoạn muốn sửa lại → main agent (Claude) làm Edit nhỏ tại chỗ. KHÔNG phải Claude reword toàn bài lại.

**Phân vai sau khi Codex chạy xong (QUAN TRỌNG):**

| Tình huống | Ai làm | Lý do |
|------------|--------|-------|
| Reword lại toàn bài / đoạn lớn | **Codex** (chạy lại `/codex:rescue` với feedback) | Giữ tính nhất quán giọng văn — model khác Claude là MỤC ĐÍCH của step này. Claude reword đè sẽ phá đặc trưng đó. |
| Sửa 1-2 câu cụ thể user chỉ rõ | **Main agent (Claude)** dùng Edit tool | Chỉnh sửa point-fix bình thường, không phải "reword phase". |
| Sửa typo / lỗi chính tả / lỗi diacritic | **Main agent (Claude)** | Mechanical fix, không liên quan giọng văn. |
| User feedback chung chung ("nghe AI quá", "thiếu thực tế") | **Codex** (chạy lại `--reword`) | Cần model khác diễn đạt lại; Claude tự sửa sẽ rơi vào AI-slop của chính nó. |

**Nguyên tắc chung:** Sau khi Codex đã reword, **Claude KHÔNG được tự ý reword lại** — chỉ làm point-fix khi user chỉ rõ câu nào. Mọi reword diện rộng phải qua `/codex:rescue` lần nữa.

**Prompt template cho `/codex:rescue`:**

```
Reword Vietnamese blog draft tại $RAW/<slug>.md để tự nhiên hơn, ít AI-slop hơn.

Constraints (HARD — không vi phạm):
- KHÔNG đổi: cấu trúc heading (level + thứ tự), code block content, frontmatter, link URL, image path, table structure, file path, tên function/struct/biến/version number, số liệu/metric.
- KHÔNG dịch hay reword tiếng Anh trong code/inline code (`backticks`).
- Giữ nguyên độ dài tổng thể (±10%).

Rewriting rules:
- Bỏ forbidden phrases trong .claude/skills/blog-workflow/references/writing-style.md (Section 8) — không "Trong thời đại...", không "Hãy cùng khám phá...", không em-dash trong câu thường, không câu hỏi tu từ generic.
- Voice: chia sẻ tự nhiên như nói chuyện trong group tech VN, không corporate, không AI-overpolished.
- Mở đầu (nếu là intro): problem-first, dẫn pain point, không định nghĩa.
- INSIDE CLAUDEKIT series: section đánh số, tone impersonal, có "Inside" subsection cho internals — giữ nguyên format này.
- Ưu tiên câu ngắn, động từ chủ động. Tránh nominalization ("việc thực hiện" → "thực hiện").

Output:
- Ghi đè trực tiếp file $RAW/<slug>.md.
- Cuối phản hồi liệt kê 3-5 thay đổi tiêu biểu (before → after) để user review nhanh.
```

**Note:** Bước này IDEMPOTENT — chạy lại `--reword` lần 2 sẽ cho output gần như cũ vì draft đã được polish. Chạy đi chạy lại nhiều lần KHÔNG khuyến khích (drift risk).

### Step 2.75: HTML Preview (`--preview <slug>`) — OPTIONAL but RECOMMENDED

Before committing to a full visual `.astro` build, generate multiple standalone HTML preview variants so the user can choose an editorial direction.

**When to run:** After draft is approved (Step 2.5 passed), BEFORE `--visual`. This is selection/prototyping only. Do not run `--visual` / Astro conversion until the user chooses a direction.

**Core rule:**

- `--preview` = multi-variant HTML mockups for choosing style.
- `--visual` = convert the chosen direction into production Astro.
- Never convert to Astro until the user explicitly chooses a preview direction or asks to proceed.

**Template reference:** Read `references/editorial-preview-templates.md` before building a multi-preview batch. It defines the reusable templates `05` → `10`, output contract, topic recommendation rules, and verification checklist.

**Output pattern:**

- Gallery: `sites/inside-{project}/assets/previews/<slug>-editorial-gallery.html`
- Mockups: `sites/inside-{project}/assets/previews/mockups/<slug>-preview-05-kami-parchment.html`, etc.
- Each mockup is standalone HTML, linked from the gallery, and safe to discard after visual direction is chosen.
- Keep gallery cards concise: template number/name, one-line style note, one-line content fit.

**Reusable editorial templates — generate all six:**

| Template | Use for | Notes |
|----------|---------|-------|
| 05 Kami Parchment | long-doc, beginner-friendly guide, calm docs-like essay | Warm parchment, single serif voice, ink-blue accent |
| 06 Guizang E-Ink | internals/deep dive, architecture, "Inside" series | E-ink editorial issue, act dividers, oversized serif rhythm |
| 07 Swiss Grid | methodology, release facts, comparison/checklist-heavy posts | 16-column rational grid, IKB accent, fact-first hierarchy |
| 08 Sunday Poster | editorial magazine, opinionated explainer, public-facing essay | Newsprint poster, large serif headline, numbered cells |
| 09 NYT Chart Ledger | data-led article, metrics, tradeoffs, timelines, evidence | Newsroom chart-led story, red annotations, source-heavy footnotes |
| 10 Safety Dossier | guard rails, security, privacy, incident, risk, compliance | Hazard stripes, tier cards, incident dossier tone |

**Template recommendation guidance:**

- `guard` / `safety` / `privacy` / `secret` / `risk` / `incident` / `security` → recommend `10 Safety Dossier`, backup `06 Guizang E-Ink`
- `inside` / `internals` / `hook` / `agent` / `workflow` / `architecture` / `harness` → recommend `06 Guizang E-Ink`, backup `07 Swiss Grid`
- `data` / `metric` / `benchmark` / `timeline` / `trend` / `evidence` / `before-after` → recommend `09 NYT Chart Ledger`, backup `07 Swiss Grid`
- `guide` / `beginner` / `how-to` / `explainer` / `docs` / `overview` → recommend `05 Kami Parchment`, backup `08 Sunday Poster`
- `opinion` / `editorial` / `magazine` / `manifesto` / `essay` → recommend `08 Sunday Poster`, backup `06 Guizang E-Ink`
- `release` / `version` / `changelog` / `feature` / `roadmap` / `methodology` → recommend `07 Swiss Grid`, backup `08 Sunday Poster`

Still generate the full requested batch unless the user explicitly asks for fewer variants. In the preview report, label the recommended template and backup with a short reason.

**Process:**

1. Read approved `$RAW/<slug>.md`; verify frontmatter `status: approved`.
2. Extract title, description, sections, tables, code blocks, callouts, diagrams; preserve article order, hierarchy, facts, inline code, paths, versions, and metrics.
3. Generate the six standalone template mockups under `assets/previews/mockups/`.
4. Generate/update gallery under `assets/previews/` linking to all mockups. If prior variants exist, keep them unless the user asks to clean up.
5. Print gallery path, local URL/open instruction, all variant paths, recommended template, backup, and reason.
6. Wait for user selection before proceeding to `--visual`.

**Preview quality requirements:**

- HTML only, no Astro syntax, no i18n JSON, no route files.
- Responsive at 390px mobile and 1440px desktop.
- No horizontal page overflow; code/table overflow must stay inside styled scroll containers.
- Logo renders correctly from the preview path.
- Article structure preserved: headings, section order, tables, code blocks, callouts, diagrams.
- No fake controls. If a preview has a theme toggle, both themes must be complete. If the preview is a fixed art-direction mockup, omit the toggle.
- Do not expose local machine paths in public visible copy.

**Scrollbar styling cho `<pre>` + `.table-wrap` (MANDATORY):**

Mặc định scrollbar OS-default (trắng/xám) phá tone dark mode. Style theo template sau:

```css
pre, .table-wrap {
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
pre::-webkit-scrollbar, .table-wrap::-webkit-scrollbar { height: 10px; width: 10px; }
pre::-webkit-scrollbar-track, .table-wrap::-webkit-scrollbar-track { background: transparent; }
pre::-webkit-scrollbar-thumb, .table-wrap::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 5px;
}
pre:hover::-webkit-scrollbar-thumb, .table-wrap:hover::-webkit-scrollbar-thumb {
  background: var(--accent);
}
pre::-webkit-scrollbar-corner, .table-wrap::-webkit-scrollbar-corner { background: transparent; }
```

Quan trọng:
- Thumb dùng `--border-strong`, KHÔNG phải `--border` — vì `--border` thường gần bằng `--bg-code` ở dark mode (vd `#1f2530` vs `#1c2330`) → thumb tàng hình. `--border-strong` đậm hơn ~1 stop, nổi rõ trên cả 2 theme.
- Tránh trick `border: 2px solid transparent + background-clip: padding-box` — làm thumb mỏng đi 4px, càng dễ mất hút.
- Verify scroll thực tế trước khi báo done — không assume "set var xong là OK".

**Verification before reporting done:**

1. Open gallery via static server or direct file path:
   ```bash
   python3 -m http.server 4325 --bind 127.0.0.1 --directory $SITE
   ```
2. Check every generated HTML returns/opens successfully.
3. Use browser/headless Chrome to check desktop + mobile:
   - no horizontal overflow
   - logo natural size is non-zero
   - section/table/code counts match rendered article structure
4. Inspect at least the recommended template screenshot by eye.

**Note:** Preview artifacts are disposable selection artifacts. The chosen direction can inform `--visual`, but `--visual` still creates the production `.astro` draft after explicit user approval.

---

### Step 3: Create Visual HTML (`--visual <slug>`)

1. Read approved `.md` from `$RAW/<slug>.md`
2. Verify `status: approved` in frontmatter
3. Read existing Astro posts for patterns (CSS variables, component imports)
4. Invoke `/ck:frontend-design` skill to generate:
   - Unique visual style (don't copy existing posts exactly)
   - Responsive design (390px+)
   - CSS animations, diagrams
   - Zero JS to client
5. Save to `$DRAFTS/<slug>.astro`
6. **IMPORTANT:** Set favicon to match the project — use `<link rel="icon" href="/favicon.ico">` (NOT `.svg`). Each project site has its own `public/favicon.ico`:
   - ClaudeKit: `sites/inside-claudekit/public/favicon.ico` (CK logo)
   - GoClaw: `sites/inside-goclaw/public/favicon.ico` (GoClaw logo)
7. Create initial `$I18N/<slug>.json` with vi keys
7. Print: "Visual draft ready at /drafts/<slug>. Run `pnpm dev` to preview."

### Step 4: User Preview

1. User reviews via `pnpm dev` server at `/drafts/<slug>`
2. User can request inline edits in Claude Code session
3. Iterate until visual is approved

### Step 5: i18n + Social (`--i18n <slug>`)

1. Generate full translations in `$I18N/<slug>.json`:
   ```json
   { "vi": {...}, "en": {...}, "zh": {...}, "ja": {...} }
   ```
2. Generate social content in `$SOCIAL/<slug>/`:
   - `content.json` — unified social posts
   - `thumbnail.html` — interactive thumbnail with controls
   - `thumbnail-og.html` — static Open Graph thumbnail source, 1200×630
   - `thumbnail-og.png` — exported preview image for visual QA
   - `thumbnail-og-en.html` — English Open Graph thumbnail source for non-VI locale previews
   - `thumbnail-og-en.png` — exported English OG preview image
3. Copy approved OG images to public assets so Astro publishes them:
   - VI: `$SITE/public/og/<slug>.png`
   - non-VI fallback: `$SITE/public/og/<slug>-en.png`
4. Wire route `<head>` metadata for every published locale:
   - VI routes use `<meta property="og:image" content="https://<site-domain>/og/<slug>.png">`
   - EN/ZH/JA routes use `<meta property="og:image" content="https://<site-domain>/og/<slug>-en.png">` unless locale-specific images are intentionally generated
   - `<meta property="og:image:width" content="1200">`
   - `<meta property="og:image:height" content="630">`
   - `<meta name="twitter:card" content="summary_large_image">`
   - `<meta name="twitter:image">` must match the locale-aware `og:image`
   - `<meta property="og:url">` and `<link rel="canonical">` must use the locale-aware public URL.
5. Verify the built HTML contains the OG/Twitter image tags and the built images exist at `dist/og/<slug>.png` and `dist/og/<slug>-en.png`.
6. Print summary with file paths

### Social Content Format

**content.json:**
```json
{
  "slug": "post-slug",
  "urls": {
    "vi": "https://goclaw.thieunv.space/posts/slug",
    "en": "https://goclaw.thieunv.space/en/posts/slug",
    "zh": "https://goclaw.thieunv.space/zh/posts/slug",
    "ja": "https://goclaw.thieunv.space/ja/posts/slug"
  },
  "posts": {
    "facebook": { "lang": "vi", "content": "..." },
    "threads": { "lang": "vi", "content": "..." },
    "x": { "lang": "en", "content": "..." },
    "linkedin": { "lang": "en", "content": "..." }
  }
}
```

**thumbnail.html controls:**
- Language: VI / EN toggle
- Theme: Dark / Light mode
- Platform preset: Facebook (1200×630), X (1200×675), LinkedIn (1200×627), Instagram (1080×1080), Threads (1080×1350)
- Export PNG button (html2canvas, 2x retina)

**thumbnail-og.html / OG image:**
- Fixed canvas: 1200×630.
- Purpose: social link preview/unfurl (`og:image`, `twitter:image`), not an admin-only export.
- Must be exported to both:
  - `$SOCIAL/<slug>/thumbnail-og.png` for source review.
  - `$SITE/public/og/<slug>.png` for production serving.
- For multilingual posts, also generate an English fallback:
  - `$SOCIAL/<slug>/thumbnail-og-en.html`
  - `$SOCIAL/<slug>/thumbnail-og-en.png`
  - `$SITE/public/og/<slug>-en.png`
- Route rule: VI uses `<slug>.png`; EN/ZH/JA use `<slug>-en.png` unless dedicated locale images exist.
- Use absolute production URLs in route meta tags. Social crawlers cannot read local `assets/social/...` files and will not execute the admin thumbnail controls.
- Keep title readable when cropped in small social cards; central 80% safe zone; no tiny body copy.
- Verify with `sips -g pixelWidth -g pixelHeight` or equivalent that the final PNG is exactly 1200×630.

**[CRITICAL] Logo in thumbnails:**
- Thumbnails live at `sites/inside-goclaw/assets/social/<slug>/thumbnail-{vi,en}.html`
- Logo lives at `sites/inside-goclaw/public/goclaw-icon.svg` (orange/red brand colors `#F08223`, `#DA4525`, `#F4972E`)
- ✅ Correct relative path (3 levels up): `src="../../../public/goclaw-icon.svg"`
- ❌ Broken path (1 level up): `src="../goclaw-icon.svg"` — file does NOT exist there
- Applies to BOTH `<img class="logo">` and `<img class="bg-logo">` (background watermark)
- ❌ NEVER apply `filter: invert(1)` to the logo — flips orange brand color to teal/cyan, breaks identity
- ✅ Render logo natively in its orange brand colors on dark backgrounds; for watermark use `opacity: 0.10–0.15` instead of inverting
- When previewed via `pnpm dev` admin iframe, dev server serves `public/` at root — but the file:// preview and html2canvas export require correct relative paths to render the logo
- For ClaudeKit thumbnails, use `sites/inside-claudekit/public/logo.png` or `logo-horizontal.png` with the same 3-level relative path rule from `$CK_SOCIAL/<slug>/`.

### Publish (`--publish <slug>`)

1. Verify draft exists at `$DRAFTS/<slug>.astro`
2. Move to published locations:
   - `$PAGES/<slug>.astro` (vi default)
   - `$PAGES_EN/<slug>.astro`
   - `$PAGES_ZH/<slug>.astro`
   - `$PAGES_JA/<slug>.astro`
3. Add card entry to `$SITE/src/pages/index.astro` (newest first)
4. Run `pnpm build` to verify
5. Auto commit: `git add . && git commit -m "publish: <slug>"`
6. Auto push: `git push`
7. Vercel auto-deploys

### Status (`--status`)

Print pipeline state:
```
Raw Drafts (assets/raw/):
  ○ knowledge-vault-hybrid   [draft] 2026-04-11
  ✓ codex-oauth-pools        [approved] 2026-04-10

Visual Drafts (src/drafts/):
  ○ agent-teams-task-board
  ○ browser-automation-resource-limits
  ... (X total)

Published (src/pages/posts/):
  ✓ codex-oauth-pools
  ✓ yield-mention-mode
  ✓ force-directed-knowledge-graphs
```

## Social Content Guidelines

### Facebook (Vietnamese)

**Tone:** Chia sẻ tự nhiên, như nói chuyện với bạn trong group tech. KHÔNG dùng giọng AI.

**Rules:**
- Viết bằng tiếng Việt
- Mở đầu giới thiệu ngắn gọn (version mới, tính năng, credit contributor nếu có)
- Dùng slang thoải mái: "ae", "xịn đét", "đỉnh của chóp"
- Max 3-4 emoji, đúng chỗ
- KHÔNG đặt URL trong bài (dùng URL selector trong Admin UI)
- Kết bài CTA nhẹ nhàng
- Max 2-3 hashtag cuối bài

### X / Twitter (English)

**Tone:** Concise, punchy, dev-oriented.

**Rules:**
- Write in English
- Single long-form post (X supports long posts)
- Lead with compelling technical insight or result
- Specific numbers, metrics, before/after
- Max 2 emojis, prefer none
- No corporate-speak

### Threads (Vietnamese)

**Tone:** Giống Facebook nhưng ngắn gọn hơn.

**Rules:**
- Viết tiếng Việt
- Tập trung 1 insight chính + CTA
- Max 2-3 emoji
- Kết bài bằng link
- KHÔNG dùng hashtag

### LinkedIn (English)

**Tone:** Professional, detailed.

**Rules:**
- Write in English
- 300-600 words
- Focus technical value + business impact
- Include 3-5 hashtags at end
- Professional but not corporate

## ClaudeKit Site Scaffold

When `--project claudekit` and `sites/inside-claudekit/` doesn't exist:

1. Prompt user to scaffold
2. Create structure:
   ```
   sites/inside-claudekit/
   ├── astro.config.mjs
   ├── package.json
   ├── src/
   │   ├── drafts/
   │   ├── pages/
   │   ├── i18n/
   │   └── content/status.json
   └── assets/
       ├── raw/
       └── social/
   ```
3. Add to pnpm-workspace.yaml
4. Add to turbo.json

## Admin UI

View social content and export thumbnails at `/admin`:

**Left Panel - Social Content:**
- Post selector dropdown
- Platform tabs: Facebook, Threads, X, LinkedIn
- Content box with copy button
- URL selector (VI/EN/ZH/JA) with copy button

**Right Panel - Thumbnail:**
- Iframe loads thumbnail.html
- Lang/Theme/Platform controls inside iframe
- Export PNG button downloads directly
