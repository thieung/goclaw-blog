---
title: "Bắt đầu với Claude Code và ClaudeKit"
project: claudekit
tags: [beginner-friendly, engineer-kit]
status: draft
created: 2026-04-14
updated: 2026-04-18
---

# Bắt đầu với Claude Code và ClaudeKit

Từ AI assistant thành development partner. Hướng dẫn Engineer Kit với real-world use cases và best practices.

---

## Section 01: Claude Code là gì?

Claude Code là môi trường coding agentic từ Anthropic — không chỉ là chatbot trả lời câu hỏi, mà là AI có thể **đọc files, chạy commands, sửa code, và tự động giải quyết vấn đề** trong khi bạn quan sát hoặc đi làm việc khác.

### Khác biệt với tools khác

| Traditional AI | Claude Code |
|----------------|-------------|
| Bạn viết code, AI review | Bạn mô tả ý tưởng, AI implement |
| Copy-paste từng đoạn | AI tự đọc/sửa files trực tiếp |
| Phải hướng dẫn từng bước | AI tự explore, plan, execute |
| Không có tool use | Full access: bash, git, file system |

### Context Window — Tài nguyên quan trọng nhất

Claude Code có context window chứa toàn bộ conversation: messages, files đã đọc, command outputs. **Performance giảm khi context đầy** — đây là constraint quan trọng nhất cần quản lý.

**Triệu chứng context đầy:**
- Claude "quên" instructions — Không follow những gì bạn đã nói trước đó
- Lặp lại công việc — Làm lại những gì đã hoàn thành
- Bỏ qua CLAUDE.md — Không follow rules đã định nghĩa

**Giải pháp:** `/clear` thường xuyên giữa các tasks không liên quan.

---

## Section 02: ClaudeKit là gì?

ClaudeKit là bộ workflow templates cho Claude Code, gồm **2 kits**:
- **Engineer Kit** — Development workflows (bài này focus)
- **Marketing Kit** — Content & marketing workflows (coming soon)

Engineer Kit (`claudekit-engineer`) biến Claude Code từ AI assistant thành development partner. Không phải app độc lập — là folder `.claude/` bạn drop vào project.

**Components:**
- **Skills** — Commands Claude invoke: `/ck:cook`, `/ck:fix`, `/ck:brainstorm`
- **Hooks** — Scripts tự động chạy khi events xảy ra
- **Agents** — Subagent roles: planner, researcher, tester
- **Rules** — Guidelines persistent mỗi session

### Philosophy: YAGNI + KISS + DRY

- **YAGNI** — You Aren't Gonna Need It — Không code tính năng chưa cần
- **KISS** — Keep It Simple — Solution đơn giản nhất
- **DRY** — Don't Repeat Yourself — Abstract khi có pattern lặp

---

## Section 03: Cài đặt và Setup

### Bước 1: Cài ClaudeKit CLI

Install CLI trước (1 lần duy nhất cho cả máy):

```bash
npm install -g claudekit-cli
```

**🧭 Installer path picker** — trả lời 4 câu hỏi để biết command phù hợp:

**1. Project status?**
- 🆕 **New project** → `ck new --dir my-project --kit engineer` (cài vào `./my-project/.claude/`)
- 📂 **Existing project** → tiếp tục câu 2-4

**2. Config scope?** (chỉ với existing project)
- 📍 **Local** (default, no flag) → cài vào `./.claude/`, riêng project này
- 🌐 **Global** (`-g` / `--global`) → cài vào `~/.claude/`, share mọi project trên máy

**3. Automation level?**
- 🖐️ **Interactive** (default) — CLI hỏi từng option · recommended cho beginner
- ⚡ **Auto** (`--yes --install-skills`) — skip prompts + install toàn bộ skills catalog

**4. Release channel?**
- ✅ **Stable** (default) — ổn định, ít bug
- 🧪 **Beta** (`--beta`) — tính năng mới nhất

**5. Existing install?** (advanced, chỉ với existing project)
- 🧷 **Keep existing** (default) — merge theo prompts, an toàn
- 🧹 **Fresh reset** (`--fresh`) — xoá CK files + replace `settings.json` & `CLAUDE.md` · backup trước khi chạy

**Các command mẫu (cross-platform — chạy trên macOS/Linux/Windows):**

```bash
# Beginner recommend: existing project, local scope, interactive
cd my-existing-project
ck init --kit engineer

# Power user: global scope + auto + beta
ck init -g --kit engineer --yes --install-skills --beta

# Brand new project
ck new --dir my-project --kit engineer

# Fresh reset — wipe existing install + reinstall clean
ck init --kit engineer --yes --install-skills --fresh
```

> 💡 Windows: chạy trong PowerShell (default) hoặc CMD (Command Prompt); Windows Terminal chỉ là terminal emulator host, `ck` là Node CLI chạy được mọi shell. Install path sẽ là `.\.claude\` (local) hoặc `%USERPROFILE%\.claude\` (global) thay cho `./.claude/` và `~/.claude/`.

> ⚠️ Nếu folder `.claude/` đã tồn tại, backup hoặc merge files thủ công trước khi init.

### Bước 2: Tuỳ chỉnh CLAUDE.md

> ✅ **Lưu ý:** `ck new` và `ck init` (mặc định "Update everything: Yes") **tự động tạo** `CLAUDE.md` template. Chỉ khi chọn "Update everything: No" và untick, CK mới bỏ qua file này.

Sau khi CK tạo template, bạn có thể **tuỳ chỉnh thêm** theo project:
- Edit trực tiếp file template vừa tạo, thêm build commands / code style / conventions
- Chạy `/init` trong Claude Code để regenerate từ codebase (nếu CLAUDE.md đã tồn tại, `/init` chỉ suggest improvements, không overwrite)
- Dùng LLM generate theo [quy tắc 200 dòng](https://thieunv.substack.com/p/ce-02-quy-tac-200-dong)

**CLAUDE.md example:**

```markdown
# Project Name

## Build Commands
- `npm install` — install dependencies
- `npm run dev` — start dev server
- `npm test` — run tests

## Code Style
- Use ES modules (import/export)
- Prefer async/await over callbacks
- TypeScript strict mode
```

> 💡 Giữ **dưới 200 dòng**. File dài tốn context và khiến Claude dễ bỏ sót rule (adherence giảm — tức mức độ tuân thủ chỉ dẫn kém đi). Chỉ ghi những gì quan trọng: build commands, coding standards, quy ước chính. Nếu instructions phình ra, tách bớt sang `@import` hoặc file trong `.claude/rules/`.

### Bước 3: Set coding level (tuỳ chọn)

Trong Claude Code session, chạy command `/ck:coding-level` (không có tham số) để mở **interactive selector** chọn 1 trong 6 levels. Hoặc set trực tiếp: `/ck:coding-level 3`.

```
# Mở interactive selector (menu 0-5)
/ck:coding-level

# Hoặc set level cụ thể
/ck:coding-level 1   # Junior mode
```

> ℹ️ **Alternative — Output Styles (native):** Claude Code có feature [Output styles](https://code.claude.com/docs/en/output-styles) riêng — chạy `/config` → chọn **"Output style"** → pick từ menu. Đây là feature **độc lập** của Claude Code, tình cờ có một số style naming tương tự CK coding levels.
>
> **Khác biệt mechanism:**
> - `/ck:coding-level` ghi vào `.ck.json`, guidelines inject qua `SessionStart` hook mỗi lần mở session.
> - Output styles thay đổi trực tiếp **system prompt** (lưu `outputStyle` trong `.claude/settings.local.json`, có hiệu lực từ session kế tiếp để giữ prompt cache ổn định).
>
> ⚠️ **Chọn 1 trong 2** — dùng `/ck:coding-level` *hoặc* native Output styles, không nên bật cả hai cùng lúc để tránh guidelines chồng chéo.

| Level | Name | Style |
|-------|------|-------|
| 0 | ELI5 | Giải thích như nói với người không biết code |
| 1 | Junior | Explains WHY, mentor style |
| 2 | Mid-level | Design patterns, system thinking |
| 3 | Senior | Trade-offs, architecture decisions |
| 4 | Tech Lead | Risk & business impact |
| 5 | God Mode | Zero hand-holding (default, cho 15+ năm kinh nghiệm) |

#### ⚡ God Mode là gì (default)

God Mode giả định bạn là **expert (15+ năm hoặc domain specialist)** — biết trước câu trả lời, chỉ cần validation/second opinion/fast typing. Claude hoạt động như *force multiplier*, không phải teacher.

**Sẽ làm:**
- Default to code, không prose
- Production-ready code ngay lập tức
- Advanced patterns không explain
- Challenge approach nếu thấy flaw nghiêm trọng
- Flag chỉ critical issues (security, data loss)
- Terse — mỗi từ phải earn its place

**Sẽ KHÔNG làm:**
- KHÔNG explain concepts/patterns/syntax
- KHÔNG "Here's how...", "Let me explain..."
- KHÔNG add comments trừ khi yêu cầu
- KHÔNG "Key Takeaways", summaries, next steps
- KHÔNG ask clarifying questions cho ambiguity nhỏ
- KHÔNG treat bạn như cần hand-holding

> 💡 Nếu mới học Claude Code, **set level 1 hoặc 2** để có explanations. God Mode tối ưu velocity nhưng giả định bạn tự debug được khi Claude sai.

---

## Section 04: Custom Rules — `.claude/rules/`

Với projects lớn, split instructions thành nhiều file nhỏ trong `.claude/rules/` thay vì nhét tất cả vào một CLAUDE.md. Rules có thể **scope theo file paths** qua YAML frontmatter — chỉ load vào context khi Claude đụng files match pattern, tiết kiệm context space.

### Anatomy: `.claude/` directory

Rules chỉ là 1 phần — `.claude/` chứa nhiều loại config. Tóm tắt **Project scope** (shared với team qua git) vs **Global scope** (personal, per-machine):

```
# Project scope — committed qua git · shared với team
./CLAUDE.md              # project instructions (hoặc ./.claude/CLAUDE.md)
./CLAUDE.local.md        # personal — gitignored
./.mcp.json              # MCP servers (team-shared)
./.worktreeinclude       # copy gitignored files vào worktree mới (optional)
./.claude/
├── settings.json        # permissions, hooks, model
├── settings.local.json  # personal — auto-gitignored
├── rules/*.md           # topic rules (path-scopable)
├── skills/<name>/       # /skill-name + bundles
├── commands/*.md        # /command (legacy — prefer skills)
├── agents/*.md          # subagents
├── agent-memory/        # project subagent memory (memory: project)
└── output-styles/*.md   # system-prompt styles

# Global scope — your machine only · never committed
~/.claude.json           # app state, personal MCP, UI prefs
~/.claude/
├── CLAUDE.md            # global instructions
├── settings.json        # default settings
├── keybindings.json     # custom shortcuts
├── rules/*.md           # user-level rules
├── skills/              # personal skills
├── commands/            # personal commands
├── agents/              # personal subagents
├── agent-memory/        # subagent memory (memory: user)
├── output-styles/       # personal styles
├── plugins/             # installed plugins (auto-managed)
└── projects/<project>/memory/  # auto-memory (Claude tự ghi)
```

> 💡 Trên Windows, `./` và `~/` ở trên thay bằng `.\` và `%USERPROFILE%\` tương ứng (ví dụ `%USERPROFILE%\.claude\`).

> ⚠️ **Rules là guidance, KHÔNG phải enforcement.** Rules (và CLAUDE.md) là instructions Claude *đọc*, không phải config Claude Code *enforce*. Claude có thể không follow nếu instructions mâu thuẫn hoặc mơ hồ. Cho behavior **guaranteed**, dùng:
> - **Hooks** (`settings.json`) — scripts chạy trước/sau tool calls
> - **Permissions** — allow/deny specific tools/commands

### CLAUDE.md vs Settings: 2 cơ chế merge khác nhau

| CLAUDE.md + rules | settings.json |
|-------------------|---------------|
| **Concatenated** vào context — cả global + project + local đều được đọc | **Key-level override** — project override global, local override project |
| Khi conflict: file load sau thắng (last read) | Arrays (`permissions.allow`) *combine*; scalars (`model`) lấy giá trị specific nhất |

> 💡 **Commands ≈ Skills.** Commands và skills giờ cùng 1 mechanism. Workflows mới nên dùng skills (bundle SKILL.md + supporting files). Nếu skill và command trùng tên, skill thắng.

> 💡 **Auto-memory.** Claude tự ghi notes vào `~/.claude/projects/<project>/memory/MEMORY.md` (first 200 dòng / 25KB loaded mỗi session). Topic files lazy-load. Toggle: `/memory` hoặc `autoMemoryEnabled` setting.

### Sự khác biệt: CLAUDE.md vs rules/

| CLAUDE.md | `.claude/rules/*.md` |
|-----------|----------------------|
| Instructions chung cho toàn project | Instructions modular, chia theo topic/path |
| Luôn load vào context từ launch | Không `paths`: load từ launch · Có `paths`: lazy-load khi match files |
| Target: under 200 dòng | Mỗi file một topic (code-style.md, testing.md...) |
| Build commands, conventions tổng quan | Domain rules: API, frontend, security, DB... |
| Một file duy nhất | Nhiều file, subdirectories recursive |

### Path-specific rules (YAML frontmatter)

Dùng field `paths` để rule chỉ active khi Claude đụng files match:

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "src/server/**/*.ts"
---

# API Development Rules

- All endpoints must validate input via Zod
- Use standard error response format
- Include OpenAPI docs comments
```

Rules **không có** `paths` field load unconditionally. Có `paths` thì trigger khi Claude read files match pattern. Glob patterns hỗ trợ brace expansion (`src/**/*.{ts,tsx}`).

### Best Practices khi tạo rules

**DO:**
- Chia rules theo **domain/concern** — một file cho một mục đích (ví dụ: `i18n-rules.md`, `testing-rules.md`, `security-rules.md`)
- Viết ngắn gọn, dùng bullet/checklist — Claude parse nhanh
- Đặt tên kebab-case, mô tả rõ (`api-error-handling.md` > `rules1.md`)
- Include **examples** cho mỗi rule (good vs bad)
- Reference paths chính xác khi rule apply cho folder cụ thể

**DON'T:**
- Viết rules dài dòng như documentation — Claude cần directives, không phải essay
- Duplicate content giữa CLAUDE.md và rules/
- Tạo rules cho những thứ YAGNI (quy tắc chỉ áp dụng 1 lần)

### Use Cases phổ biến

#### UC1: Multi-language app (i18n)

Tạo `.claude/rules/i18n-rules.md`:

```markdown
# i18n Rules

## Scope
Apply to all user-facing text in src/components/ and src/pages/.

## Rules
- Mọi user-visible string PHẢI dùng `t('key')` từ `useTranslation()`
- Translation keys đặt tại `src/i18n/{locale}/{namespace}.json`
- Support locales: vi (default), en, zh, ja
- Key naming: `section.component.element` (ví dụ: `hero.title.main`)
- KHÔNG i18n: code snippets, entity IDs, technical identifiers

## Khi thêm text mới
1. Thêm key vào `src/i18n/vi/{ns}.json` trước (default locale)
2. Copy key sang 3 locales còn lại với placeholder
3. Cập nhật `src/i18n/index.ts` nếu tạo namespace mới
```

#### UC2: API Error Handling

`.claude/rules/api-error-handling.md`:

```markdown
# API Error Handling

## Pattern
Mọi API call phải wrap trong try/catch, return discriminated union:
  { ok: true, data } | { ok: false, error }

## Error Types (src/types/errors.ts)
- NetworkError, ValidationError, AuthError, ServerError

## UI Display
- Toast cho transient errors (NetworkError)
- Inline form errors cho ValidationError
- Redirect to /login cho AuthError
```

#### UC3: Database Migration Safety

`.claude/rules/db-migration.md`:

```markdown
# Database Migration Rules

- NEVER drop columns trong migration — mark deprecated trước, drop ở release sau
- Mọi migration phải có `up()` VÀ `down()` — rollback-safe
- Index concurrent (Postgres: `CONCURRENTLY`) cho tables > 10k rows
- Test migration trên copy of prod data trước khi merge
```

#### UC4: Testing Standards

`.claude/rules/testing-rules.md`:

```markdown
# Testing Rules

## Coverage
- Unit tests cho business logic: > 80%
- Integration tests cho API endpoints
- E2E tests cho critical user flows (login, checkout)

## Conventions
- Test files: `*.test.ts` cạnh source file
- Arrange/Act/Assert pattern
- Dùng factories thay vì fixtures hardcode
- Mock external services, KHÔNG mock internal modules
```

#### UC5: Security Baseline

`.claude/rules/security-rules.md`:

```markdown
# Security Rules

- NEVER log secrets, tokens, passwords
- Input validation: Zod schema at API boundary
- SQL: prepared statements only, no string concat
- Auth middleware check trên mọi protected route
- CORS whitelist từ env, không wildcard
- Dependencies: audit weekly với `npm audit`
```

### Thứ tự nạp file (Loading Order)

Khi mở một session, Claude đọc các file memory theo thứ tự từ trên xuống, rồi **nối (concatenate)** tất cả vào context — không ghi đè lẫn nhau.

```
1. ~/.claude/CLAUDE.md                              Global user instructions — áp cho mọi project
         │
         ▼
2. <project>/CLAUDE.md + CLAUDE.local.md            Walk-up từ CWD lên project root, nối tất cả lại
         │
         ▼
3. ~/.claude/rules/*.md  →  <project>/.claude/rules/*.md   Project rules ưu tiên cao hơn user rules khi trùng topic
         │
         ▼
4. ~/.claude/projects/<project>/memory/MEMORY.md    Auto-memory (Claude tự ghi, 200 dòng / 25KB đầu)
         │
         ▼
   ⇢ Session context (concatenated)
```

Rules có `paths` frontmatter chỉ kích hoạt khi Claude đụng file khớp pattern — không nạp lúc khởi động. Nhờ vậy bạn có thể viết rule riêng cho từng thư mục mà không làm CLAUDE.md phình ra.

> 📏 **Kích thước khuyến nghị:** Anthropic khuyến nghị **CLAUDE.md nên dưới 200 dòng**. File dài hơn sẽ làm *adherence* giảm — nghĩa là Claude bỏ sót hoặc lờ đi rule của bạn nhiều hơn vì phải đọc quá nhiều thông tin. File rule cũng nên giữ ngắn. Khi CLAUDE.md sắp chạm 200 dòng, hãy tách ra `.claude/rules/` theo chủ đề (ví dụ `api-design.md`, `testing.md`, `security.md`). Đặt tên file mô tả rõ nội dung để cả team và chính Claude tìm nhanh bằng Grep.

### Cơ chế nạp file nâng cao

Khi project lớn hoặc muốn chia sẻ rule giữa nhiều repo, bạn có 4 cơ chế mở rộng context. Mỗi cơ chế kéo thêm file vào `CLAUDE.md` gốc theo cách khác nhau.

#### `@import` syntax — nhúng file khác thẳng vào CLAUDE.md

Trong CLAUDE.md, viết `@docs/coding-standards.md` hoặc `@~/.claude/my-prefs.md` để nhúng nội dung file đó vào đúng vị trí. Claude hỗ trợ cả đường dẫn tương đối lẫn tuyệt đối, độ sâu tối đa **5 lần nhúng lồng nhau** (hop). Dùng để tách content dài ra file riêng mà vẫn giữ CLAUDE.md gọn.

```markdown
@docs/coding-standards.md
@~/.claude/rules/security.md
@.claude/rules/testing.md
```

#### `--add-dir` flag — mở thêm thư mục làm việc trong cùng session

Thông thường Claude Code chỉ đọc file trong thư mục bạn khởi chạy (working directory). Flag `--add-dir` cho phép mở thêm thư mục khác vào cùng một session — tiện khi làm monorepo hoặc cần tham chiếu thư mục `../shared`, `../design-system` bên ngoài project hiện tại.

Ba cách kích hoạt đều tương đương: flag `--add-dir` khi chạy lệnh, slash command `/add-dir` ngay trong session, hoặc khai báo `additionalDirectories` trong `settings.json`.

```bash
# Flag khi launch
claude --add-dir ../shared --add-dir ../design-system

# Hoặc slash command trong session
/add-dir ../shared
```

**Lưu ý quan trọng:** mặc định Claude *không* nạp file `CLAUDE.md` hay `CLAUDE.local.md` từ các thư mục thêm qua `--add-dir` — để giữ tương thích ngược với project cũ. Nếu muốn Claude áp dụng memory từ những thư mục đó, bật biến môi trường sau trước khi chạy:

```bash
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
claude --add-dir ../shared
```

Sau khi bật, mọi `CLAUDE.md` hoặc `CLAUDE.local.md` trong thư mục được thêm sẽ được nạp cùng với project chính, giúp Claude hiểu quy ước riêng của từng workspace trong cùng một session. Tính năng này có từ phiên bản **2.1.20** và để opt-in vì lý do tương thích ngược.

#### `CLAUDE.local.md` — ghi chú cá nhân, không commit vào git

File dành cho sở thích riêng của bạn trong project (URL sandbox, tài khoản test, lệnh debug cá nhân). Thêm `CLAUDE.local.md` vào `.gitignore` để không lẫn vào commit. Claude nạp file này cùng với `CLAUDE.md` nhưng chỉ hiển thị với máy bạn — team khác không thấy.

```markdown
# Personal Prefs (gitignored)

- Use pnpm, not npm
- Prefer tab indentation
- Test API với redis local ở port 6380
```

#### Symlinks share rules — dùng chung một bộ rule cho nhiều project

Thư mục `.claude/rules/` hỗ trợ symlink — bạn giữ bộ rule chuẩn của team ở một nơi duy nhất rồi link vào từng project. Khi cập nhật rule, mọi project đều nhận cùng lúc. Claude tự phát hiện symlink vòng (circular) và bỏ qua, không bị kẹt.

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

**User-level rules** — `~/.claude/rules/*.md` apply cho mọi project trên máy. Dùng cho personal preferences không project-specific.

---

## Section 05: 7 Commands cốt lõi cho beginners

### `/ck:brainstorm`
Explore solutions trước khi commit. Output: Trade-off analysis, pros/cons, recommendation.

```
/ck:brainstorm How should we implement real-time notifications? WebSockets vs SSE vs polling?
```

### `/ck:plan`
Detailed planning cho features phức tạp. Research → Plan → Files list → Success criteria.

```
/ck:plan Implement user authentication with OAuth2 (Google, GitHub)
```

### `/ck:cook`
Command chính để implement. 8-step workflow: Research → Review → Plan → Review → Implement → Review → Test → Finalize.

```
/ck:cook Add a logout button to the navbar
```

Flags: `--fast` (skip research) | `--auto` (skip all review gates)

### `/ck:fix`
7-step process (0-6): Mode Selection → Scout → Diagnose → Complexity → Fix → Verify → Finalize.

```
/ck:fix Users can't login after session timeout - seeing "Invalid token" error
```

### `/ck:ask`
Hỏi technical questions. Như có senior engineer bên cạnh.

```
/ck:ask How does our authentication middleware handle token refresh?
```

### `/ck:test`
Run tests. Support multiple test runners.

```
/ck:test src/auth/    # Test specific folder
```

### `/ck:watzup`
Review session changes. Files modified, git diff analysis, impact assessment.

```
/ck:watzup
```

---

## Section 06: Real-World Use Cases

### UC1: Build feature mới (Beginner)

**Tình huống:** Thêm user settings page với dark mode toggle và notification preferences.

```bash
/ck:brainstorm User settings page: dark mode + notifications.
Should we store in localStorage or backend? Component structure?

# → Output: plans/reports/brainstorm-260414-user-settings.md

/ck:plan Implement per brainstorm report at
plans/reports/brainstorm-260414-user-settings.md

/ck:cook              # Execute: implement → review → test → done
/ck:git cm            # Commit with message
```

**Kết quả:** Feature complete với proper planning. Code reviewed, tested, committed.

### UC2: Fix bug nhanh (Beginner)

**Tình huống:** Form validation không show error message khi email invalid.

```bash
/ck:fix Email validation in signup form doesn't show
error message. File: src/components/SignupForm.tsx

Expected: "Invalid email" appears below input
Actual: No message, just red border

/ck:test src/components/SignupForm.test.tsx
```

**Kết quả:** Bug fixed với regression test. 7-step process (scout → fix → verify).

### UC3: Onboard codebase mới (Intermediate)

**Tình huống:** Join team mới, cần hiểu codebase nhanh trước khi contribute.

```bash
/ck:scout src/                    # Explore structure
/ck:ask How does the authentication flow work?
/ck:ask Explain src/services/auth/token-handler.ts
/ck:ask What patterns does this codebase follow?
```

**Kết quả:** Hiểu architecture, key flows, patterns trong 30 phút thay vì 2 ngày đọc docs.

### UC4: Refactor an toàn (Intermediate)

**Tình huống:** Module cũ 500 LOC, needs cleanup nhưng sợ break existing functionality.

```bash
/ck:ask Analyze src/legacy/user-manager.js
What are the hidden dependencies? Side effects?

/ck:plan Refactor user-manager.js into smaller modules.
Must maintain all existing behavior. Write tests first.

/ck:cook                          # Tests first, then refactor
/ck:code-review                    # Verify no regressions
```

**Kết quả:** Code modular, có tests, zero regression. Confident refactoring.

### UC5: Dựng UI từ Figma (Intermediate)

**Tình huống:** PM gửi Figma mockup, cần implement pixel-perfect với animations.

```bash
/ck:frontend-design [paste Figma URL hoặc screenshot]
# Auto-activates /ck:ui-ux-pro-max (design intelligence)
# Claude generates với đúng spacing, colors, animations

/ck:ui-styling Add dark mode support cho component vừa tạo
/ck:test src/components/NewFeature.test.tsx
```

**Kết quả:** UI pixel-perfect, responsive, có dark mode. Không cần designer review lại.

---

## Section 07: Best Practices

### DO: Cho Claude cách verify kết quả

**Single highest-leverage tip.**

**Bad:** `implement email validation`

**Good:**
```
write validateEmail function.
Test cases: user@example.com → true
Run tests after implementing.
```

### DO: Brainstorm → Plan → Cook

Standard flow:
1. `/ck:brainstorm [explore options]`
2. `/ck:plan [detail implementation]`
3. `/ck:cook [implement + test]`
4. `/ck:git cm [commit]`

> `/ck:cook` đã bao gồm testing. Dùng `/ck:test [path]` riêng khi cần test specific folder.

**Khi nào skip `/ck:brainstorm`?** Dùng `/ck:plan` trực tiếp khi:
- Đã biết rõ approach (fix bug cụ thể, add endpoint theo spec)
- Task đơn giản, không cần explore alternatives
- Đã có design/spec từ Figma hoặc PRD

Dùng `/ck:brainstorm` trước khi: chưa biết approach nào tốt nhất, cần trade-off analysis (WebSockets vs SSE), feature mới chưa có tiền lệ.

### 🎨 UI Features: Mockup trước khi implement

Với UI-heavy features, thêm bước mockup để review trước:

```
/ck:brainstorm → /ck:plan → /ck:frontend-design (mockup) → Review → /ck:cook
```

Mockup HTML với mock data nhanh hơn implement thật. Catch design issues sớm, tránh rework.

### DO: Provide specific context

**Bad:** `add tests for auth`

**Good:**
```
write tests for src/auth/token-refresh.ts:
- successful refresh with valid token
- failure when token expired > 7 days
- concurrent refresh requests
```

### DO: Clear context thường xuyên

Khi nào cần `/clear`:
- Chuyển sang task hoàn toàn khác
- Claude sai > 2 lần cùng vấn đề
- Claude bắt đầu "quên" instructions

---

## Section 08: Bad Practices (Tránh!)

### ❌ Kitchen sink session
Làm nhiều unrelated tasks trong 1 session → context đầy rác, Claude confused.
*Ví dụ:* "Fix login" → "Add dark mode" → "Optimize images" → "Back to login"
**Fix:** `/clear` giữa mỗi task không liên quan

### ❌ Correct the same issue repeatedly
Claude sai → correct → vẫn sai → correct lại... Context polluted với failed approaches.
**Fix:** After 2 failed corrections → `/clear` và viết prompt tốt hơn

### ❌ Skip planning for "simple" tasks
"This is simple, no need to plan" → 3 hours later, still debugging edge cases.
**Fix:** `/ck:plan --fast` cho lightweight planning

### ❌ Trust without verify
Claude: "Done!" → Ship to production → Everything broken.
**Fix:** `/ck:test` + manual testing + code review → then ship

### ❌ Overly vague prompts
"make it better", "fix the bug", "add auth" — không đủ context để Claude làm đúng.
**Fix:** Specific symptom + location + expected behavior

---

## Section 09: Common Workflow Patterns

### Pattern 1: Quick fix (< 5 min)
```
/ck:cook --fast Fix typo
/ck:git cm "fix: typo"
```

### Pattern 2: Standard feature
```
/ck:brainstorm
/ck:plan → /ck:cook
/ck:git cm
```

### Pattern 3: Complex (multi-day)
```
Day 1: /ck:brainstorm → /ck:plan
Day 2+: /ck:cook [Phase N]
        /clear between phases
```

### Pattern 4: Bug investigation
```
/ck:debug [symptom + logs]
Phân tích root cause → fix thủ công hoặc /ck:fix
```

---

## Section 10: Skills Roadmap

### Beginner (Week 1)
`/ck:brainstorm` · `/ck:plan` · `/ck:cook` · `/ck:fix` · `/ck:ask` · `/ck:test` · `/ck:git`

### Intermediate (Week 2-4)
`/ck:scout` · `/ck:code-review` · `/ck:debug` · `/ck:ship` · `/ck:watzup` · `/ck:frontend-design` · `/ck:ui-styling`

### Advanced (Month 2+)
`/ck:team` · `/ck:autoresearch` · `/ck:predict` · `/ck:security` · `/ck:loop` · `/ck:scenario` · `/ck:xia` · `/ck:bootstrap` · **+ nhiều skills khác**

> ℹ️ Danh sách đầy đủ và tài liệu chi tiết cho tất cả commands: [vividkit.dev/guides/commands](https://www.vividkit.dev/guides/commands)

---

## Section 11: Cheat Sheet

| Situation | Command |
|-----------|---------|
| Explore options | `/ck:brainstorm [question]` |
| Plan feature | `/ck:plan [description]` |
| Implement feature | `/ck:cook [description]` |
| Quick small fix | `/ck:cook --fast [fix]` |
| Fix bug | `/ck:fix [symptom]` |
| Technical question | `/ck:ask [question]` |
| Run tests | `/ck:test [path]` |
| Explore codebase | `/ck:scout [path]` |
| Code review | `/ck:code-review [path\|--pr N]` |
| Review changes | `/ck:watzup` |
| Commit | `/ck:git cm "message"` |
| Full ship pipeline | `/ck:ship` |
| Clear context | `/clear` |
| Set beginner mode | `/ck:coding-level 1` |

> 📘 Cheat sheet này chỉ liệt kê 14 lệnh thường dùng. Xem bảng tra cứu đầy đủ, cú pháp chi tiết và ví dụ thực tế cho mọi command tại [vividkit.dev/guides/commands](https://www.vividkit.dev/guides/commands).

---

## Summary

**Claude Code** = AI có thể đọc/sửa code trực tiếp, full tool access.
**ClaudeKit** = Engineering workflow template với bộ skills chuyên biệt, liên tục được mở rộng.

**Core workflow:** `/ck:brainstorm` → `/ck:plan` → `/ck:cook` → `/ck:git cm`

**5 rules:**
1. **Verify** — Luôn cung cấp test cases để kiểm chứng
2. **Plan first** — Brainstorm → Plan → Execute
3. **Clear often** — Dùng `/clear` giữa các task
4. **Be specific** — Ghi rõ symptom, location, expected
5. **Trust but verify** — Luôn có bước con người review

**Rules persistence:** Dùng `.claude/rules/*.md` cho domain-specific behavior (i18n, testing, security...). Claude load mỗi session.
