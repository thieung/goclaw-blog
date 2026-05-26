---
title: "Guard rails trong Claude Code và ClaudeKit"
description: "Hooks, rules và hard-gate ngăn Claude làm bậy: scout-block, privacy-block, simplify-gate, plan-then-cook, và những chỗ guard rail còn hở"
series: "Inside ClaudeKit"
product: "ClaudeKit Engineer"
project: claudekit
status: approved
created: 2026-05-26
slug: guard-rails-in-claude-code-and-claudekit
tags: [claudekit, hooks, safety, guard-rails, internals]
---

# Guard rails trong Claude Code và ClaudeKit

*Hooks chặn file, rules chặn drift, hard-gate chặn skip phase. Bài này mổ xẻ từng tầng guard rail, scenario nó bắt được, và những chỗ nó vẫn hở.*

Bạn giao task refactor module nhỏ. Agent đọc `node_modules/` để "hiểu thư viện", glob `**/*.ts` ở root, cat `.env` để "check API key value", rồi ship một diff 600 dòng không qua simplify. Không lâu sau, context đầy rác, secret leak vào transcript, PR đẩy lên review đỡ không kịp.

Cùng một agent, cùng codebase, nhưng có guard rails đứng giữa: scout-block exit 2 khi đụng `node_modules`, privacy-block bật prompt approval cho `.env`, simplify-gate hard-block command `ship` khi diff vượt 400 LOC, hard-gate XML buộc plan trước cook. Cái cần chặn được chặn ở lớp hook chứ không phải hi vọng model "tự ngoan".

ClaudeKit Engineer (CK) build trên Claude Code gắn vào đúng chỗ đó: vài hook code chạy thật, 9 rule files inject vào context, một bộ HARD-GATE XML trong skill markdown, và các guard skill chủ động. Bài này đi qua 6 nhóm guard rail, kèm scenario thật chúng bắt được, kèm các chỗ còn hở để ai dùng CK biết khi nào không nên tin.

> **Ý chính**
>
> Guard rails trong CK gồm 2 lớp. Lớp **hook** chạy code thật (PreToolUse, UserPromptSubmit), fail-closed về behavior nhưng fail-open trên crash. Lớp **rule + hard-gate** là chỉ thị tự nhiên, Claude vẫn có thể lệch nếu prompt yếu. Hai lớp bù nhau, không thay nhau.
>
> Lưu ý quan trọng: native permission dialog của Claude Code bị tắt trong CK (`bypassPermissions: true`). Mọi file-access enforcement dồn vào hook layer. Hook crash đồng nghĩa guard của lớp đó biến mất silently.


## Section 01: Sáu nhóm guard rail trong CK

| Nhóm | Cơ chế | Ví dụ | Mức ép buộc |
|------|--------|-------|-------------|
| File-access blockers | Hook PreToolUse | scout-block, privacy-block | Code, fail-open trên crash |
| Workflow gates | Hook UserPromptSubmit | simplify-gate, workflow-artifact-gate | Code |
| Context injection | Hook UserPromptSubmit | dev-rules-reminder | Code, inject text |
| Skill hard-gates | XML trong skill markdown | `<HARD-GATE>` trong ck:cook, ck:fix | Instruction, model phải tuân |
| Rules (LLM instructional) | Markdown auto-load qua CLAUDE.md | review-audit-self-decision, team-coordination | Instruction |
| Guard skills | Skill chủ động user gọi | ck:security-scan, ck:predict, ck:scenario | Phụ thuộc user |

Phân biệt quan trọng: **hook** là code chạy ngoài model, có thể exit 2 chặn tool. **Rule + hard-gate** là text inject vào context, Claude vẫn quyết định cuối. Khi bị bypass, hai lớp lệch theo cách khác nhau.

### 9 scenario quen thuộc mà các nhóm này bắt được

| Scenario | Guard chặn |
|----------|-----------|
| Đọc `node_modules/react/...` để hiểu thư viện | scout-block PreToolUse, exit 2 |
| Đọc `.env` để check API key value | privacy-block, exit 2 kèm JSON prompt |
| Glob `**/*.ts` ở project root | scout-block broad-pattern, exit 2 kèm suggest narrow |
| Ship diff 600 LOC chưa simplify | simplify-gate UserPromptSubmit, hard-block (nếu gate enabled) |
| Implement auth feature thẳng không qua plan | ck:cook HARD-GATE, từ chối code trước plan |
| Reviewer suggest đổi threshold user đã chốt | review-audit-self-decision rule, buộc surface, không auto-apply |
| Hai agent cùng edit `src/api/routes.ts` | team-coordination rule, ownership violation stop |
| Ship khi thiếu `adversarial-validation.json` | workflow-artifact-gate (nếu bật), hard-block |
| Path traversal `../../.ssh/id_rsa` | privacy-block detect kèm `isSuspiciousPath()` |


## Section 02: Settings và config landscape

Hai file config quyết định hook nào thực sự bật:

### Hai layer config

| File | Mục đích |
|------|----------|
| `~/.claude/settings.json` | Native Claude Code: permission, allowed tools, base hooks |
| `~/.claude/.ck.json` | CK-specific: enable/disable từng hook, kit metadata |

### settings.json gây hiểu nhầm

```json
{
  "bypassPermissions": true,
  "skipDangerousModePermissionPrompt": true
}
```

Nghĩa là native permission dialog của Claude Code đã tắt hoàn toàn. Mọi file-access guard còn lại đều đi qua hook. Nếu hook crash (fail-open design), agent đọc file bị chặn được. Đây là design trade-off lớn nhất của CK: chấp nhận giảm friction ở mức Claude Code native, dồn enforcement vào hook layer riêng để kiểm soát chi tiết hơn.

### .ck.json enable/disable map

`DEFAULT_CONFIG` trong `lib/ck-config-utils.cjs:70-83`:

```
scout-block: true
privacy-block: true
simplify-gate: true   (chú ý: xem Section 04)
workflow-artifact-gate: false (opt-in)
dev-rules-reminder: true
```

Per-hook disable: set `false` trong `~/.claude/.ck.json` hoặc project `.claude/.ck.json`.

**Merge semantics:** project config được merge vào global. Cùng key thì project thắng global. Khác key thì cộng dồn. Nghĩa là disable một hook ở project không cần xoá khỏi global, ngược lại bật hook bị global tắt thì project có thể override.

Emergency env bypass:

- `CK_SIMPLIFY_DISABLED=1`
- `CK_WORKFLOW_ARTIFACT_GATE_DISABLED=1`

### Cách check hook đang active hay đang fail-open silent

Claude Code log stderr của hook ra terminal khi crash. Hai cách phổ biến:

1. Chạy Claude Code trong terminal session, stderr của hook hiện trực tiếp trong console khi prompt fire
2. Tail session log directory để xem hook output

Nếu hook code crash, output sẽ có stack trace. Không thấy stack trace đồng nghĩa hook không crash, nhưng không đảm bảo hook đã fire. Hook có thể bị disable trong config hoặc skip do điều kiện trigger không match. Để confirm hook chạy thật, đặt một `console.error('[hook-name] fired')` ở đầu hook code và check stderr.

### Path sanitization trong config loader

`sanitizePath()` (`lib/ck-config-utils.cjs:492-516`) chặn null byte và `../` traversal trong relative config value. Quan trọng vì project `.ck.json` được merge với global. Nếu attacker control project config có thể inject path escape. Sanitize trước khi merge là chặn class attack đó.


## Section 03: scout-block, chặn đọc thư mục rác

### Vấn đề mà scout-block giải quyết

Agent rất hay rơi vào pattern này:

- "Để mình đọc `node_modules/react/` xem implementation"
- "Glob `**/*.ts` ở root cho biết codebase có gì"
- "Cat thử `dist/index.js` xem build ra sao"

Mỗi lần như vậy là vài chục nghìn token nuốt vào context window, kéo theo cost và degrade chất lượng các turn sau. Tệ hơn, kết quả từ `node_modules` ô nhiễm context. Agent bắt đầu reference thư viện code thay vì source code project.

### Cơ chế

`scout-block.cjs` đăng ký dưới PreToolUse, chạy trước mọi Read/Bash/Glob/Grep.

Pipeline:

1. Load `.ckignore` shipped baseline (`~/.claude/.ckignore`) cộng project-local `.claude/.ckignore` nếu có
2. Parse bằng package `ignore` (gitignore-spec)
3. Extract path từ `tool_input.file_path`, `tool_input.path`, hoặc bash command qua `path-extractor.cjs`
4. Hai detection mode:
   - Path match: nếu path hit `.ckignore` pattern thì exit 2
   - Broad pattern: nếu Glob dùng `**/*.ts`, `**/*`, `*.*` ở project root thì exit 2 kèm suggest narrow pattern

Default blocked dirs (`pattern-matcher.cjs:15-34`): `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `__pycache__`, `.venv`, `venv`, `vendor`, `target`, `.git`, `coverage`.

### Allowlist quan trọng

Có một exception phải biết: **build commands luôn pass**. `BUILD_COMMAND_PATTERN` trong `lib/scout-checker.cjs:25` cho `npm build`, `go build`, `cargo build`, `make`, `docker build` đi qua mặc dù chúng có thể chạm `node_modules` hoặc `dist`. Nếu chặn build thì cả ck:ship cũng chết.

### Behavior khi crash

Fail-open: bất kỳ parse error hoặc exception lạ đều dẫn tới exit 0, tool pass. Đây là design choice ưu tiên availability hơn strict enforcement. Nếu hook code có bug, guard rail cho lớp đó tắt silently, agent đọc thoải mái. Đây là gap đầu tiên cần biết.


## Section 04: privacy-block, chặn đọc secret kèm approval flow

### Vấn đề

Cùng class với scout-block nhưng phạm vi khác: agent đụng `.env`, `id_rsa`, `*.pem`, `credentials.yaml`. Đây không phải "context rác", đây là **leak vào transcript**. Một khi secret value vào context, nó có thể bị log, bị quote lại trong code reviewer output, bị paste vào PR description.

### Cơ chế

`privacy-block.cjs` đăng ký dưới PreToolUse cho Read/Write/Edit (và warn cho Bash):

1. `lib/privacy-checker.cjs` regex-match path vs sensitive pattern set:
   - `^\.env$`, `^\.env\.` (trừ `.env.example`, `.env.sample`, `.env.template`)
   - `credentials`, `secrets?.ya?ml`, `\.pem`, `\.key`, `id_rsa`, `id_ed25519`
2. URI decode trước khi match để catch `%2e` obfuscation (`privacy-checker.cjs:98-103`)
3. Nếu hit và chưa có prefix `APPROVED:`, exit 2 kèm JSON marker:

```
@@PRIVACY_PROMPT_START@@
{ "type": "PRIVACY_PROMPT", "question": {...}, "options": [...] }
@@PRIVACY_PROMPT_END@@
```

4. Claude phải parse JSON, gọi `AskUserQuestion`. Nếu user duyệt thì retry với prefix `APPROVED:.env` để bypass.

Flow này được tài liệu hoá trong CLAUDE.md global, không phải convention ngầm. Nó tận dụng `AskUserQuestion` để buộc user approval explicit thay vì để model tự diễn dịch consent.

### Sensitive pattern có extensible không

Pattern set hard-code trong `lib/privacy-checker.cjs:28-39`. Nếu repo có file secret riêng (ví dụ `vault-credentials.json`), không có hook config public nào để thêm pattern. Hai cách workaround:

1. Đặt file vào path khớp regex sẵn có (ví dụ rename thành `*-credentials.*`)
2. Fork hook hoặc patch `PRIVACY_PATTERNS` array local

Không có config flag kiểu `privacyBlock.extraPatterns` ở thời điểm bài này viết.

### Bash exemption, gap rất rõ

`privacy-block.cjs:133` cho Bash tool đi qua, chỉ warn. Lý do là user-facing flow "Yes thì bash cat <file>" cần Bash chạy được, mà Bash được auto-approve theo policy. Tác dụng phụ: bất kỳ ai đã có quyền chạy Bash đều có thể đọc secret mà không qua approval flow. Đây là gap thứ hai.

### Nếu đã leak rồi

Privacy-block chỉ chặn READ. Khi secret đã vào transcript, file không thể "rút lại". Việc cần làm:

1. Rotate credential ngay (đổi API key, regenerate token)
2. Audit conversation log directory của Claude Code để xác định mức leak
3. Check git history xem secret có bị commit vô tình không, nếu có thì rewrite history

Tốt nhất không tin "privacy-block đã bảo vệ", luôn rotate khi nghi ngờ.


## Section 05: simplify-gate, chặn ship diff quá to

### Vấn đề

Pattern hay gặp: feature branch dài 2 tuần, diff 800 LOC, agent nói "OK, mình ship". Code chưa qua simplify pass, có khả năng vẫn còn dead code, abstraction sớm, helper không ai gọi. Một khi merge thì rollback đắt.

### Cơ chế

`simplify-gate.cjs` đăng ký dưới UserPromptSubmit. Stateless. Đọc `git diff HEAD` mỗi lần fire.

Trigger phrase: `ship`, `merge`, `pr`, `deploy`, `publish` xuất hiện trong prompt user.

Threshold hard-block (theo default):

- Tổng diff > 400 LOC, hoặc
- Số file đụng > 8, hoặc
- Một file đơn lẻ > 200 LOC

> **Chú ý:** Default install dormant. Hook script chạy nhưng gate không block gì. Cần `simplify.gate.enabled = true` trong project config để thực sự bật. Chi tiết ở dưới.

Output khi block:

> Diff vượt ngưỡng simplify. Chạy code-simplifier trước khi ship.

Soft-warn (không block) khi prompt có `commit`, `finalize`, `release`. Cảnh báo nhưng cho qua.

### Cảnh báo quan trọng về default

`DEFAULT_CONFIG.hooks['simplify-gate'] = true` chỉ nghĩa **script được phép chạy**. Bên trong, `DEFAULTS.gate.enabled = false` (`simplify-gate.cjs:19`). Hook fire xong sẽ exit ngay ở line 160 nếu `gate.enabled === false`. Kết quả: install mặc định không block gì.

Để bật thật sự, project config cần explicit:

```json
{
  "simplify": { "gate": { "enabled": true } }
}
```

`.ck.json` hooks map nói `true` (script chạy), nhưng gate sub-config mặc định `false` (không block). Audit cả hai layer trước khi tin simplify-gate đang bảo vệ.

### Cách lệch ngoài ý muốn

`matchedSeverity()` (`simplify-gate.cjs:39-51`) exempt vài phrasing: `"don't ship"`, `"do not ship"`, `"ship on"`. Mục đích là khi user nói chuyện meta về ship ("don't ship yet, let me review first"), hook không bật. Tác dụng phụ: natural language phrasing như "ship on Friday" tự nhiên qua được.

### Emergency bypass

Khi cần ship gấp bỏ qua gate: `CK_SIMPLIFY_DISABLED=1` env var. Có chủ ý. Guard rail không nên block 100% mọi lúc, sẽ có lúc user biết rõ họ làm gì và cần override.


## Section 06: workflow-artifact-gate, validate 5 artifact JSON

### Vấn đề

Khi team chạy full pipeline (plan, cook, review, adversarial, ship), mỗi phase nên drop một artifact JSON record lại decision. Thiếu artifact thì không có proof user đã review, không có proof adversarial pass. Ship trong tình trạng này là ship blind.

### Cơ chế

`workflow-artifact-gate.cjs` đăng ký dưới UserPromptSubmit và PreToolUse(Bash). Default **off**, opt-in.

5 artifact JSON cần có trước ship/push/pr/deploy:

| Artifact | Phase tạo | Nội dung |
|----------|-----------|----------|
| `context-snippets.json` | scout/plan | Snippet code đã đọc |
| `risk-gate.json` | predict | High-risk flag, auto-stop required |
| `verification.json` | fix/cook | 5-point verification checklist pass |
| `review-decision.json` | code-review | Reviewer verdict |
| `adversarial-validation.json` | adversarial | Adversarial pass |

### Cách hook tìm artifact directory

`artifact-locator.cjs` resolve theo 4 bước, dừng ở bước đầu tiên match:

1. CLI flag `--artifact-dir <path>` truyền vào hook
2. Env var `CK_WORKFLOW_ARTIFACT_DIR`
3. Pointer file `.claude/workflow-artifacts.json` ở project root
4. Fallback scan `plans/reports/harness/` subdirs, lấy thư mục modified gần nhất trong 24h

Nếu bước 4 trả về nhiều harness dir gần đây, resolution fail và user phải set env var explicit. Hook **không** đọc path từ context của Claude. `dev-rules-reminder` inject report path cho subagent instruction, nhưng `workflow-artifact-gate` resolve độc lập qua chain trên.

Validation:

- Schema check: `validateRiskGate` kiểm tra `highRisk=true → autoStopRequired=true` (`artifact-schema.cjs:44-58`)
- Secret scan trong artifact content: AWS keys, GitHub tokens, OpenAI keys, private key headers (`validator.cjs`)
- Hard stages (ship/push/pr/deploy): `emitBlock()`, continue false, Claude Code stop
- Soft stages (finalize/commit): `emitSoft()`, warning, không stop

### Vì sao opt-in

Với task nhỏ, ép có đủ 5 artifact là overkill. Default-off nghĩa là chỉ team nào explicit muốn discipline kiểu này mới bật. Trade-off rõ: cost-benefit không hợp cho mọi case, để user quyết.


## Section 07: Hard-gate XML trong skill markdown

### Vấn đề

Hook chỉ chặn được tool call. Có những loại lỗi không phải tool call mà là **trình tự**: code trước plan, fix trước scout, ship trước review. Cách CK xử lý là gắn `<HARD-GATE>` XML block vào skill markdown.

### Ví dụ trong ck:cook (`cook/SKILL.md:46-51`)

Trước khi xem ví dụ, lưu ý: HARD-GATE respect explicit user instruction. Có dòng "User override" trong định nghĩa, nghĩa là model được phép bỏ qua gate nếu user yêu cầu tường minh. Không cứng tuyệt đối.

```xml
<HARD-GATE>
Do NOT write implementation code until a plan exists and has been reviewed.
This applies regardless of task simplicity. "Simple" tasks are where unexamined assumptions waste the most time.
Exception: --fast mode skips research but still requires a plan step.
User override: If user explicitly says 'just code it' or 'skip planning', respect their instruction.
</HARD-GATE>
```

ck:cook có 4 hard-gate:

- `HARD-GATE`: không code trước plan
- `HARD-GATE-SCOUT-FIRST`: phải đọc codebase summary trước
- `HARD-GATE-EXACT-REQUIREMENTS`: 5-point clarification checklist
- `HARD-GATE-NO-SIDE-EFFECTS`: blast radius proof trước finalize

ck:fix cũng có 4 hard-gate:

- `HARD-GATE`: scout trước fix
- `HARD-GATE-SCOUT-FIRST`: codebase đọc xong mới chẩn đoán
- `HARD-GATE-EXACT-ROOT-CAUSE`: 6-point root cause checklist
- `HARD-GATE-NO-SIDE-EFFECTS`: verify không vỡ chỗ khác

Ngoài 4 tag XML, ck:fix có thêm một section markdown tên Anti-Rationalization (`fix/SKILL.md:79`), liệt kê pattern lệch (giả định, suy đoán) gắn với câu trả lời cứng. Section này không phải XML hard-gate, nhưng đóng vai bổ trợ.

### Tại sao gọi là "hard"

Hard ở đây không phải code-enforced. Đây là instruction in prompt, Claude vẫn phải tuân theo. Khác với hook ở chỗ: nếu model bỏ qua HARD-GATE, không có exit 2 nào chặn. Format XML cộng naming "HARD-GATE" làm signal đặc biệt mạnh để model không rationalize qua. Trong session revision dài, hard-gate giữ được phase ordering tốt hơn rule mềm. Nhưng vẫn không phải hook, model bug vẫn lệch được.


## Section 08: Rules auto-load qua CLAUDE.md

### Cơ chế inject

`dev-rules-reminder.cjs` đăng ký UserPromptSubmit, build context qua `lib/context-builder.cjs`, inject rules text vào mỗi prompt. TTL 5 phút per `(sessionId, baseDir)` để tránh đốt token. Pre-condition: rules được khai báo trong global CLAUDE.md.

### 9 rule chính

| File | Guard chống lại | Đặc trưng |
|------|-----------------|-----------|
| `review-audit-self-decision.md` | Audit tự ý reverse decision user đã confirm | "Verified is sticky" |
| `development-rules.md` | Skip test, fake data, syntax error | YAGNI / KISS / DRY |
| `team-coordination-rules.md` | Hai agent cùng edit một file | File ownership glob |
| `mr-review-style.md` | "Phase X" leak vào commit/PR | No plan label in git |
| `commit-messages.md` | Commit body dài lê thê | Single-line default |
| `code-comments.md` | Comment kiểu `file.rb:42` (rot dễ) | Cite symbol thay vì line |
| `code-formatting.md` | Ruby vertical alignment padding | Single-space rule |
| `orchestration-protocol.md` | Pass full session history qua subagent | Context isolation |
| `primary-workflow.md` | Skip simplify/test/review phase | Phase ordering |

### Đặc tính chung

Rules là **text injection**, không phải code. Hệ quả:

- Claude có thể đọc nhưng vẫn lệch nếu prompt user đè
- Không có code-level enforce, không exit 2 nào chặn
- Sức mạnh phụ thuộc model. Model yếu có khả năng bỏ qua rule cao hơn, model mạnh tuân tốt hơn

Bù lại: rule rất dễ thêm/sửa, không cần redeploy. Phù hợp cho stylistic guard (commit format, comment convention) hơn là security guard.


## Section 09: Guard skills, lớp guard chủ động user gọi

Gọi bằng slash command trong Claude Code chat (`/ck:security-scan`, `/ck:predict`, v.v.).

| Skill | Khi dùng | Bắt cái gì |
|-------|----------|-----------|
| `ck:security-scan` | Pre-release | Hardcoded secret (AWS/GitHub/Stripe), npm audit CVE, SQL injection, XSS, command injection, path traversal, `.env` tracked in git |
| `ck:predict` | Trước feature rủi ro | 5 persona (Architect, Security, Perf, UX, Devil's Advocate) debate, verdict GO/CAUTION/STOP |
| `ck:scenario` | Pre-implementation | 12-dimension edge case sweep: auth, timing/race, input extreme, GDPR, compliance, business edge case |
| `ck:fix` (4 hard-gate) | Bug / CI failure | Scout-first, root-cause-first, blast-radius proof, plus Anti-Rationalization section |
| `ck:cook` (4 hard-gate) | Feature implementation | Plan-first, scout-first, requirement-first, no-side-effects |
| `ck:ship` | Pre-PR pipeline | Stop on test failure, critical review, major version bump, merge conflict. Never force-push |

`ck:security-scan` không output raw secret value, kể cả khi tìm thấy. Chỉ report location cộng redacted snippet. Scan ra secret rồi để raw value trong report là tự bắn vào chân.

`code-reviewer` agent chạy 9-item behavioural checklist: concurrency, error boundary, API contract, backwards compat, input validation, auth/authz, N+1, data leak, fact-check plan claim vs codebase. Đây là guard cuối trước merge.


## Section 10: Các gap đã biết

Honest list, biết để khỏi tin sai.

1. **`bypassPermissions: true` đồng nghĩa mọi file-access guard phụ thuộc hook**. Hook crash đồng nghĩa lớp đó mở. Privacy-block và scout-block đều exit 0 trên unexpected error.
2. **Bash exempt khỏi privacy-block** (`privacy-block.cjs:133` chỉ warn). Bất kỳ approved Bash flow nào đều bypass được approval prompt.
3. **workflow-artifact-gate default off** (`DEFAULT_CONFIG.hooks["workflow-artifact-gate"]: false`). User không bật thì gate strongest ngủ yên.
4. **simplify-gate dormant by default**. Hook chạy nhưng `DEFAULTS.gate.enabled = false`. Cần bật explicit qua project config (xem Section 05).
5. **simplify-gate dễ trượt qua bằng phrasing**. `"ship on Friday"`, `"don't ship"` đều exempt. Natural language workaround không cố ý vẫn bypass.
6. **`.ckignore` baseline có thể negate `node_modules`**. Trong install hiện tại của tôi, `~/.claude/.ckignore` chỉ có một dòng `!node_modules`, allowlist `node_modules` trở lại. Default pattern khác trong `pattern-matcher.cjs` vẫn block. Kiểm tra `~/.claude/.ckignore` trực tiếp trước khi tin scout-block chặn `node_modules` ở install của bạn.
7. **Rules là instruction, không phải code**. development-rules, team-coordination, review-audit-self-decision đều inject text. Claude có thể lệch. Không exit 2 nào ép.
8. **HARD-GATE XML cũng là instruction**. `<HARD-GATE>` trong skill markdown phụ thuộc Claude tuân. `--fast` mode explicit skip research gate. Mỗi hard-gate cũng có dòng "User override" cho phép explicit user instruction qua mặt.

### Không có rate-limit / quota guard

Một runaway agent có thể call hàng nghìn Read/Glob/Bash. Hook không count, không throttle. Cost guard không phải design goal của hook layer này, đó là job của Claude Code billing layer phía trên.


## Section 11: Inside, chi tiết dễ bỏ sót

Source citation cho ai muốn đọc code:

| Chi tiết | File:line |
|----------|-----------|
| Build command allowlist trong scout-block | `lib/scout-checker.cjs:25` |
| Sensitive pattern set của privacy-block | `lib/privacy-checker.cjs:28-39` |
| Bash exemption trong privacy-block | `privacy-block.cjs:133` |
| simplify-gate severity exempt phrase | `simplify-gate.cjs:39-51` |
| simplify-gate dormant flag | `simplify-gate.cjs:19` (`DEFAULTS.gate.enabled = false`) |
| Default hook enable map | `lib/ck-config-utils.cjs:70-83` |
| Path sanitize trong config loader | `lib/ck-config-utils.cjs:492-516` |
| ck:cook HARD-GATE definition | `cook/SKILL.md:46-51` |
| Risk gate schema validator | `artifact-schema.cjs:44-58` |
| URI decode catch obfuscation | `privacy-checker.cjs:98-103` |

### Tổng kết mổ xẻ

Ba insight chính sau khi đọc code:

1. **Hai lớp khác bản chất**. Hook code chạy thật, fail-open trên crash. Rule + hard-gate là text injection, model phải tuân. Đừng nghĩ "tất cả guard rail bảo vệ giống nhau".
2. **Default-on khác default-active**. scout-block, privacy-block, dev-rules-reminder vừa enable vừa active mặc định. simplify-gate enable nhưng dormant (`gate.enabled = false` ở inner config). workflow-artifact-gate disable hoàn toàn. Khi audit security posture, đừng chỉ check outer hook flag, phải check inner config của từng hook.
3. **Path extraction từ bash command là non-obvious**. `path-extractor.cjs` parse cả bash command để detect path, không chỉ `file_path` field. URI decode trước match (`privacy-checker.cjs:98-103`) bắt `%2e` obfuscation mà string match đơn giản bỏ sót. Đây là loại detail chỉ thấy khi đọc code, không thấy từ doc.


## Section 12: Best practices và pitfalls

### Best practices

- Đọc `~/.claude/.ck.json` ngay sau khi cài CK để biết hook nào on, hook nào off cho install hiện tại
- Bật `workflow-artifact-gate` cho repo nào ship production code. Opt-in nhưng đáng
- Nếu muốn simplify-gate thực sự block, set `simplify.gate.enabled = true` trong project `.ck.json`
- Cần đọc `node_modules` thật (debug thư viện): tạo project `.ckignore` override thay vì disable scout-block toàn cục
- Khi privacy-block prompt approval `.env`, đọc kỹ prompt trước khi duyệt, đừng auto-yes
- Custom rule file mới: thêm vào CLAUDE.md global thay vì hi vọng Claude tự nhớ. Không inject thì rule không có hiệu lực

### Pitfalls

- Nghĩ `bypassPermissions: false` là default. Không phải, CK ship `true` để giảm friction
- Tin simplify-gate đang block diff to. Mặc định gate dormant, cần bật explicit
- Tin hook không bao giờ fail. Fail-open design, crash đồng nghĩa lớp đó mở
- Tin rule là code-enforced. Rule là text, Claude có thể lệch
- Bật full workflow-artifact-gate cho task nhỏ. Overkill, friction lớn
- Disable scout-block để đọc một file rồi quên bật lại. Rất dễ xảy ra
- Đặt secret value vào commit message rồi tin privacy-block chặn. Privacy-block chặn READ, không chặn commit

### 5 câu kiểm tra trước khi tin guard rail

- [ ] `.ck.json` đã bật những hook nào? (Cả outer flag và inner config)
- [ ] `bypassPermissions` trong `settings.json` đang là gì?
- [ ] Có project `.ckignore` override không? Đặc biệt `node_modules` có bị `!` allowlist không?
- [ ] Rule files trong CLAUDE.md có đầy đủ không?
- [ ] Có hook nào đang crash silent trong session này không (check stderr)?


## Tóm tắt

Khi đụng task lớn, kiểm tra config trước, đừng cho rằng "CK đã cài là an toàn". Một install có thể có `node_modules` allowlist riêng, một install khác có thể off `workflow-artifact-gate`, một install thứ ba có thể chưa bật `simplify.gate.enabled`. Audit `.ck.json` rẻ hơn audit lại bug sau ship.

Bốn lớp guard rail bù nhau theo cách khác nhau: hook crash thì lớp đó tắt silently, rule có thể bị prompt user đè qua, hard-gate XML respect explicit user override, guard skill chỉ chạy khi user chủ động gọi. Biết giới hạn từng lớp giúp tin đúng chỗ.
