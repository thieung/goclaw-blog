---
name: thieung:blog
description: Unified blog workflow — topic research, markdown drafts, visual HTML, i18n, and social content generation for GoClaw and ClaudeKit projects.
user_invocable: true
command: /thieung:blog
arguments: "--topic TOPIC --project PROJECT | --review SLUG | --reword SLUG | --visual SLUG | --i18n SLUG | --social SLUG | --status | --version VERSION | --scan | --publish SLUG"
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
/thieung:blog --visual <slug>                                     # Step 3: .md → visual .astro
/thieung:blog --i18n <slug>                                       # Step 5: Incremental translations only
/thieung:blog --social <slug>                                     # Step 6: Social content + thumbnails/OG
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
3. Sinh `description` (meta, 150-160 ký tự) theo `references/marketing/og-meta-templates.md`. **Guard:** lọc qua writing-style — factual, đúng tông series, KHÔNG "Action verb + CTA" marketing, KHÔNG superlative. Dùng cho `<meta>`/OG/Twitter ở Step 3.
4. Save to `$RAW/<slug>.md` with frontmatter:
   ```yaml
   ---
   title: "Post Title"
   description: "Meta factual 150-160 ký tự (xem og-meta-templates.md)"
   project: goclaw|claudekit
   version: vX.Y.Z (optional)
   status: draft|approved
   created: YYYY-MM-DD
   ---
   ```
5. Print: "Draft saved. Running parallel review..."
6. Proceed to Step 2.5 automatically

### Step 2.5: Draft Review (auto after Step 2)

Spawn 3 sub-agents in parallel to review the draft (đúng/sai · tone · completeness):

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

#### Sub-agent 3: Completeness & Meta Checklist

**Purpose:** Kiểm tra bài đủ thành phần bắt buộc + sẵn sàng meta cho Step 3. Khác Sub-agent 1 (đúng/sai kỹ thuật) và Sub-agent 2 (tone/AI-slop).

**Process:**
1. Read draft from `$RAW/<slug>.md`
2. Chạy `references/marketing/content-audit-checklist.md`: structure, use-case cụ thể (§10.2), best practices + pitfalls (§10.3), `description` frontmatter (150-160 ký tự), OG image path readiness.
3. **Guard:** phân loại sang writing-style rules (no AI-slop, no overclaim §10.4). **KHÔNG** dùng 4U/AIDA/CTA-first-person/score 0-10 của MK. Chỉ phân loại **Sẵn sàng / Cần bổ sung** + liệt kê thiếu sót.
4. Save to `plans/reports/checklist-{date}-{slug}.md`

#### After All Three Reviews Complete

1. Main agent consolidates findings
2. Display summary to user:
   ```
   Draft Review Complete
   ─────────────────────
   Fact Check: 8 verified, 2 mismatches, 1 unverified
   Adversarial: 3 concerns raised
   Checklist: Cần bổ sung (thiếu Pitfalls, description trống)

   See reports:
   - plans/reports/factcheck-260412-{slug}.md
   - plans/reports/adversarial-260412-{slug}.md
   - plans/reports/checklist-260412-{slug}.md
   ```
3. User reviews reports and either:
   - **Approve:** Update frontmatter `status: approved`, proceed to Step 2.6
   - **Refine:** Request corrections, main agent updates draft, re-run reviews

### Step 2.6: Reword Draft (`--reword <slug>`)

**Purpose:** Polish wording của markdown draft bằng `/codex:rescue` — khai thác model khác (GPT-5.4 qua Codex) để rewording vì nó cho góc nhìn ngôn ngữ khác Claude, ít AI-slop hơn ở tiếng Việt long-form.

**When to run:** Sau khi draft đã `status: approved` qua Step 2.5, TRƯỚC khi `--visual`. Nếu user thấy wording đã ổn (đặc biệt với draft ngắn / release note), có thể skip thẳng sang Step 3.

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
   - **Accept full:** Proceed to Step 3 (`--visual`). Done.
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

### Step 5: Incremental i18n (`--i18n <slug>`)

**Core rule:** `--i18n` is translation-only. Do NOT generate social posts, thumbnails, OG images, or route metadata in this step. Run `--social <slug>` after translations pass validation.

**Cost guard:** default to changed-only translation. Do NOT send the full article, full Astro file, or full 4-locale JSON to an LLM unless this is the first translation for the slug or the user explicitly requests a full rebuild.

**Deterministic helper:** use `scripts/i18n-deterministic-tools.js` through the `pnpm i18n:*` commands below. The LLM only translates chunk payloads; it never merges, rewrites, sorts, or validates the full i18n JSON.

1. Read the source route/draft and existing `$I18N/<slug>.json`.
2. Treat `vi` as the source of truth. Ensure the JSON shape stays:
   ```json
   { "vi": {...}, "en": {...}, "zh": {...}, "ja": {...} }
   ```
3. Build a dirty-key queue for each target locale (`en`, `zh`, `ja`):
   - key missing in target locale
   - target value is empty, truncated, malformed, or has broken HTML tags/placeholders
   - `vi` source text changed since the last accepted translation
   - Use the deterministic helper, not an LLM, to produce this queue:
     ```bash
     pnpm i18n:plan -- $I18N/<slug>.json --write
     ```
4. Track source hashes outside the runtime translation JSON, for example:
   - `$I18N/.cache/<slug>.source-hashes.json`
   - Do NOT add `_meta` or hash data inside `$I18N/<slug>.json`; Astro imports this JSON at runtime.
5. Reuse translation memory before calling an LLM:
   - exact same `vi` text already translated in the current slug
   - common UI labels (`Trang chủ`, `Mục lục`, `Tóm lại`, `Light`, `Dark`, etc.)
   - unchanged existing target values when the source hash is unchanged
6. Chunk dirty keys by section prefix instead of translating the whole file:
   - `meta_*`, `hero_*`, `toc_*`, `s1_*`, `s2_*`, ...
   - keep each chunk around 40-80 keys, smaller for long paragraphs/tables
   - prompt should contain only: locale, short glossary, the dirty key/value pairs, and strict output schema
7. Translation prompt constraints:
   - return one JSON object for the requested locale/chunk only
   - preserve exact keys
   - preserve inline code, technical identifiers, URLs, HTML tags, placeholders, and product names
   - do not translate code blocks, command names, file paths, or entity IDs
   - keep tone natural and non-marketing
8. Merge deterministically:
   - LLM output goes into the `translations` object of the chunk JSON generated by `pnpm i18n:plan -- ... --write`
   - merge translated chunks with:
     ```bash
     pnpm i18n:merge -- $I18N/<slug>.json <locale> $I18N/.cache/<slug>.dirty/<locale>/<chunk>.json
     ```
   - never ask an LLM to rewrite or hand-merge the full i18n file
   - preserve existing key order when practical; append new keys near their section
9. Validate before reporting done:
   - exact key-set parity for `vi`, `en`, `zh`, `ja`
   - no empty values
   - no truncation patterns (`or`, `and`, `và`, `hoặc`, `と`, `或`, dangling comma, unclosed tags)
   - HTML tag parity for `<code>`, `<strong>`, `<em>`, `<a>`
   - placeholder/URL/code-token parity
   - run both checks when available:
     ```bash
     pnpm i18n:check -- $I18N/<slug>.json
     pnpm validate:i18n -- $I18N/<slug>.json
     ```
10. Only after validation passes, update `$I18N/.cache/<slug>.source-hashes.json`:
    ```bash
    pnpm i18n:accept -- $I18N/<slug>.json
    ```
11. Print a concise summary:
   - keys translated per locale
   - chunks regenerated
   - reused keys from existing translations/translation memory
   - validation result

**Parallelism rule:** parallelize by locale/chunk only after dirty keys are extracted. Each parallel worker receives only its chunk, never the whole article or full translation JSON.

### Step 6: Social Assets (`--social <slug>`)

**Core rule:** `--social` owns all social content, thumbnails, OG images, and route social metadata. It should read the validated i18n JSON, but it should not regenerate article translations.

1. Verify `$I18N/<slug>.json` exists and passes key parity/truncation checks.
2. Generate/update social content in `$SOCIAL/<slug>/`:
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
6. Print summary with file paths.

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
- Purpose: social link preview/unfurl (`og:image`, `twitter:image`), not an internal-only export.
- Must be exported to both:
  - `$SOCIAL/<slug>/thumbnail-og.png` for source review.
  - `$SITE/public/og/<slug>.png` for production serving.
- For multilingual posts, also generate an English fallback:
  - `$SOCIAL/<slug>/thumbnail-og-en.html`
  - `$SOCIAL/<slug>/thumbnail-og-en.png`
  - `$SITE/public/og/<slug>-en.png`
- Route rule: VI uses `<slug>.png`; EN/ZH/JA use `<slug>-en.png` unless dedicated locale images exist.
- Use absolute production URLs in route meta tags. Social crawlers cannot read local `assets/social/...` files and will not execute thumbnail controls.
- Keep title readable when cropped in small social cards; central 80% safe zone; no tiny body copy.
- Verify with `sips -g pixelWidth -g pixelHeight` or equivalent that the final PNG is exactly 1200×630.

**[CRITICAL] Logo in thumbnails:**
- Applies to both Codex and Claude runs. Every generated static thumbnail/OG source (`thumbnail-{vi,en}.html`, `thumbnail-og*.html`) MUST include:
  - A visible project logo/brand mark near the header/top safe zone.
  - A bottom-right site footnote inside the 1200×630 safe zone (`goclaw.thieunv.space` or `claudekit.thieunv.space`).
- Footnote style: small but readable (roughly 14–18px), medium/high contrast, never overlapping title, subtitle, CTA, badges, or border decoration.
- Light/dark background rule:
  - On dark backgrounds, render the logo in native brand colors; a subtle dark/transparent chip is OK when it improves contrast.
  - On light backgrounds, do NOT place a light/white wordmark directly on the page. Use a contrast chip/backplate, or render icon + dark text manually.
  - If the thumbnail has theme controls, verify logo and footnote readability in BOTH light and dark modes before exporting.
- Thumbnails live at `sites/inside-goclaw/assets/social/<slug>/thumbnail-{vi,en}.html`
- Logo lives at `sites/inside-goclaw/public/goclaw-icon.svg` (orange/red brand colors `#F08223`, `#DA4525`, `#F4972E`)
- ✅ Correct relative path (3 levels up): `src="../../../public/goclaw-icon.svg"`
- ❌ Broken path (1 level up): `src="../goclaw-icon.svg"` — file does NOT exist there
- Applies to BOTH `<img class="logo">` and `<img class="bg-logo">` (background watermark)
- ❌ NEVER apply `filter: invert(1)` to the logo — flips orange brand color to teal/cyan, breaks identity
- ✅ Render logo natively in its orange brand colors on dark backgrounds; for watermark use `opacity: 0.10–0.15` instead of inverting
- When previewed via `pnpm dev`, the dev server serves `public/` at root — but file/static preview and html2canvas export require correct relative paths to render the logo
- For ClaudeKit thumbnails, use `sites/inside-claudekit/public/logo.png` or `logo-horizontal.png` with the same 3-level relative path rule from `$CK_SOCIAL/<slug>/`.
  - `logo-horizontal.png` contains a light wordmark, so keep it on a dark chip/backplate.
  - On light thumbnail backgrounds, prefer `logo.png` plus manually rendered dark `ClaudeKit` text, or keep `logo-horizontal.png` inside a dark readable chip.
- After export, visually inspect the PNG by eye and verify all logo/footnote assets loaded with HTTP 200 or non-zero natural dimensions.

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

**Char limit + OG image size:** `references/marketing/platform-specs.md` (FB 63K/1200×630, X 280/1600×900, Threads 500/1080×1350, LinkedIn 3000/1200×627). **Guard:** đây chỉ là trần kỹ thuật + kích thước ảnh. Giọng văn, hashtag, độ dài thực tế theo guideline bên dưới — KHÔNG áp hook clickbait hay "best posting time" của MK.

### Facebook (Vietnamese)

**Tone:** Chia sẻ tự nhiên, như nói chuyện với bạn trong group tech. KHÔNG dùng giọng AI.

**Rules:**
- Viết bằng tiếng Việt
- Mở đầu giới thiệu ngắn gọn (version mới, tính năng, credit contributor nếu có)
- Dùng slang thoải mái: "ae", "xịn đét", "đỉnh của chóp"
- Max 3-4 emoji, đúng chỗ
- KHÔNG đặt URL trong bài nếu platform workflow quản URL riêng; nếu cần link, để ở comment/link field riêng
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
