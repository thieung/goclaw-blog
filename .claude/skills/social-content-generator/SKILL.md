---
name: social-content-generator
description: Generate social media content (Facebook, X/Twitter) and thumbnail images from blog posts in the posts/ folder. Extracts post content, rewrites for each platform's tone and format, creates OG/social thumbnail HTML.
user_invocable: true
command: /social
arguments: "<post-filename> [--platform facebook|threads|x|all] [--thumbnail] [--all]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Bash
---

# Social Content Generator

Generate platform-specific social media content from blog posts.

## Usage

```
/social <post-filename> [--platform facebook|x|all]
```

- `post-filename`: File name in `posts/` folder (e.g., `codex-oauth-pools.html`)
- `--platform`: Target platform. Default: `all` (generates both)

## Before Writing

1. **Read existing social posts** to match tone consistency:
   ```
   social/*/*.txt
   ```
   If previous outputs exist, read at least 2 to calibrate voice.

2. **Gather facts** about the post:
   - Read the HTML file from `posts/<post-filename>`, extract text content (skip style/script tags)
   - Check `git log --oneline posts/<post-filename>` for context: who committed, related PRs
   - Extract: title, version tag, main problem, key features, how it works

3. **Do NOT invent facts** — only use information present in the blog post or git history.

## Writing Rules Per Platform

### Facebook (Vietnamese)

**Tone:** Chia sẻ tự nhiên, như đang nói chuyện với bạn bè trong group tech. KHÔNG dùng giọng AI.

**Rules:**
- Viết bằng tiếng Việt
- Mở đầu bằng giới thiệu ngắn gọn (version mới, tính năng mới, credit contributor nếu có)
- Nếu có nhiều ý nhỏ cho một ý lớn, xuống dòng với dấu `-` cho từng ý
- Độ dài vừa phải — đủ để người đọc hiểu và muốn tìm hiểu thêm
- Có thể dùng emoji cảm xúc nhưng tối đa 3-4 emoji cho cả bài, KHÔNG lạm dụng
- KHÔNG đặt URL trong bài post (thuật toán FB giảm reach cho post có link). URL để riêng trong facebook-comment.txt
- Kết bài bằng CTA nhẹ nhàng (mời thử, hỏi ý kiến, "link ở comment")
- KHÔNG dùng hashtag quá nhiều, tối đa 2-3 hashtag cuối bài
- KHÔNG viết kiểu marketing/quảng cáo. Viết như đang chia sẻ thật

**Format mẫu:**
```
[Giới thiệu — version mới + tính năng, credit contributor nếu có]

[Mô tả ngắn gọn vấn đề mà tính năng giải quyết]

[Cách hoạt động]
- Ý 1
- Ý 2
- Ý 3

[Kết quả / lợi ích cụ thể]

[CTA nhẹ nhàng — "link ở comment"]

#hashtag1 #hashtag2
```

**Facebook Comment (chứa URL):**
```
[URL bài viết đầy đủ]
```

### X / Twitter (English)

**Tone:** Concise, punchy, dev-oriented. Write like a dev sharing something cool they built.

**Rules:**
- Write in English
- X supports long-form posts — write as a single post, NOT a thread
- Lead with the most compelling technical insight or result
- Be specific with numbers, metrics, before/after comparisons
- Use technical terms naturally (developers are the audience)
- Max 2 emojis total, prefer none
- End with link to full post
- No corporate-speak
- Okay to use abbreviations common in dev X (e.g., "TIL", "ngl", "fr")

**Format:**
```
[Hook — the problem or surprising result]

[How it works — technical but accessible]

[The interesting part — what makes this different]

[Result / what's next]

[Link]
```

### Threads (Vietnamese)

**Tone:** Giống Facebook nhưng ngắn gọn hơn. Casual, chia sẻ tự nhiên.

**Rules:**
- Viết bằng tiếng Việt
- Ngắn hơn Facebook — tập trung vào 1 insight chính + CTA
- Poster/thumbnail dùng chung với Facebook (1200x630)
- Có thể include link trực tiếp trong post (Threads không penalize link như FB)
- Max 2-3 emoji
- Kết bài bằng link
- KHÔNG dùng hashtag (Threads không support hashtag tốt)

**Format:**
```
[Hook ngắn gọn — 1-2 câu giới thiệu tính năng]

[Giải thích ngắn — vấn đề gì, giải quyết thế nào]

[Highlight chính — điểm hay nhất]

[Link]
```

## Output

Save to `social/<post-slug>/` directory (create if not exists). Each platform gets its own `.txt` file — plain text, ready to copy-paste.

**File structure:**
```
social/
├── export.html                    # Poster export page (select post/lang/platform → Export PNG)
└── <post-slug>/
    ├── facebook-post.txt          # Nội dung bài post (KHÔNG có URL)
    ├── facebook-comment.txt       # URL để paste vào comment đầu tiên
    ├── threads-post.txt           # Threads content (Vietnamese, casual)
    ├── x-post.txt                 # X post content (English)
    ├── thumbnail-en.html          # Poster EN (1200x630, clean — no UI controls)
    └── thumbnail-vi.html          # Poster VI (1200x630, clean — no UI controls)
```

**Rules:**
- Files are plain `.txt` — no markdown formatting, no headers, no metadata
- Content is exactly what gets pasted onto the platform
- For X threads: separate each tweet with a blank line and `---` separator
- After saving, print file paths and a brief preview of each

## Thumbnail Generation (`--thumbnail` or `--all`)

Generate a self-contained HTML thumbnail (1200x630) for social media sharing.

**When:** Use `--thumbnail` flag, or `--all` to generate text + thumbnail together.

**Steps:**
1. Read the blog post HTML to extract: title, version, subtitle/description, tags
2. Detect the post's visual style from its CSS variables (colors, fonts)
3. Generate `social/<post-slug>/thumbnail.html` with bilingual support (EN + VI tabs)

**Design Rules:**
- Dimensions: exactly `1200px × 630px`, `overflow: hidden` on body
- Layout: GoClaw icon (top-left, use `/goclaw-icon.svg` with transparent background), version badge (top-right), title (center), subtitle, tags (bottom-left), `goclaw.thieunv.space` (bottom-right)
- Left accent bar: 6px vertical gradient using post's accent colors
- Fonts: match the post's font family (load from Google Fonts)
- Colors: extract from post's CSS `:root` variables, create cohesive palette
- GoClaw icon: use `<img src="../../../goclaw-icon.svg">` — NO black background, the SVG itself has transparent bg
- "INSIDE GOCLAW" eyebrow text above title
- Generate separate files per language: `thumbnail-en.html`, `thumbnail-vi.html` — NO lang toggle in output
- Self-contained: inline all styles, only external dependency is Google Fonts + the SVG icon
- Clean output: NO toolbars, NO buttons, NO scripts — pure visual poster ready for screenshot/export

**Template reference:** See existing thumbnails in `social/*/thumbnail-*.html` for layout examples.

**Export page:** `social/export.html` — loads thumbnail HTML in iframe, supports:
- Post selection (dropdown)
- Language selection (EN/VI)
- Platform size presets: Facebook/LinkedIn (1200×630), X/Twitter (1200×675), Threads/Instagram (1080×1080), Substack (1200×600)
- Export PNG button (html2canvas, 2x retina scale)
- Auto-scales preview to fit viewport

**After generating:** Tell user to open `social/export.html` in browser, select post/lang/platform, then click Export PNG. Or open individual `thumbnail-*.html` files directly and screenshot.

## Quality Checks

Before finishing, verify:
- [ ] No URL in facebook-post.txt
- [ ] No AI-generated tone (avoid: "bạn đã bao giờ...", "hãy cùng khám phá...", "đừng bỏ lỡ...")
- [ ] All facts come from the actual blog post — nothing invented
- [ ] Each X tweet is under 280 characters
- [ ] Tone matches existing posts in `social/` (if any exist)

## After Generating

Ask the user if they want to:
- Adjust tone (more casual / more technical)
- Shorten or expand
- Regenerate for a specific platform

## Reference: Facebook Tone Example

This is the approved tone for Facebook posts. Study this carefully — match the voice, casualness, and structure:

```
🦊 GoClaw từ v2.34.0 có thêm một tính năng khá xịn: Codex OAuth Pools - auto switch giữa nhiều account Codex subscriptions mà không cần config thủ công gì thêm

Tính năng này do Kai contribute (giờ ae thấy bóng dáng của CCS trong đó chưa 😆), ta nói nó đỉnh của chóp luôn, nhìn xịn đét 🔥

Ý tưởng đơn giản: ai có nhiều tài khoản Codex Pro/Plus/Business, thay vì hết quota account này phải tự chuyển sang account kia, giờ gộp hết vào một pool rồi GoClaw tự lo phần còn lại:

- Tự rotate request qua các account theo từng strategy (có 3 kiểu: round robin, priority, hoặc primary first)
- Hết quota account A thì tự nhảy sang account B, không cần config "chạy bằng cơm"
- Dashboard xem quota real-time từng account luôn

Agent thì chỉ cần set inherit là xong, không phải config gì thêm.

Chi tiết mình để link ở comment nhé

#GoClaw #OpenAICodex
```

**Takeaways từ example trên:**
- Mở đầu giới thiệu version + tính năng, không đặt vấn đề kiểu AI
- Credit contributor tự nhiên, kèm inside joke nếu có
- Dùng slang Việt thoải mái: "ae", "xịn đét", "đỉnh của chóp", "chạy bằng cơm"
- Emoji ít nhưng đúng chỗ (🦊 mở đầu branding, 😆 joke, 🔥 highlight)
- Giải thích kỹ thuật bằng ngôn ngữ bình dân
- CTA cuối rất nhẹ, không push
