---
title: "Guard rails hoạt động thế nào trong Claude Code và ClaudeKit"
description: "Guard rail trong agentic coding là gì, vì sao chỉ dặn prompt là chưa đủ, và cách ClaudeKit chặn hành động rủi ro bằng hook, rule, simplify-gate và hard-gate"
series: "Inside ClaudeKit"
product: "ClaudeKit Engineer"
project: claudekit
version: "claudekit-engineer@2.19.1"
status: approved
created: 2026-05-26
slug: guard-rails-in-claude-code-and-claudekit
tags: [claudekit, hooks, safety, guard-rails, internals]
---

# Guard rails hoạt động thế nào trong Claude Code và ClaudeKit

*Không phải lỗi agent nào cũng sửa được bằng cách dặn thêm một dòng prompt. Khi agent có quyền đọc file, chạy shell, sửa code và ship PR, cần một lớp đứng giữa ý định của model và hành động thật.*

Case xuyên suốt: **refactor một module nhỏ trong repo thật**.

Task nghe đơn giản. Agent muốn "hiểu thêm" nên đọc `node_modules/`, quét `**/*.ts` từ root, mở `.env` để kiểm tra key, rồi chuẩn bị ship diff 600 dòng vì test pass. Chỉ vài phút sau, context đầy file không liên quan, secret đã nằm trong transcript, còn PR thì quá lớn để review tử tế.

Cùng một agent, cùng codebase, nếu có guard rails, các bước nguy hiểm bị chặn sớm: đọc `node_modules/` bị scout-block trả exit 2, `.env` phải qua prompt duyệt, diff lớn bị simplify-gate chặn trước ship, còn skill hard-gate nhắc agent phải plan trước khi code. Agent không tự nhiên "ngoan hơn". Chỉ là trước khi nó làm gì đó, có một lớp đứng ra hỏi: việc này có nên được phép chạy không?

> **Ý chính**
>
> Guard rail không làm model thông minh hơn. Nó giống một cái cầu dao: kiểm tra hành động trước khi tool chạy, hoặc đặt rule đủ rõ để agent khó đi tắt. Trong ClaudeKit, hook là lớp chặn thật; rule, hard-gate và guard skill là các lớp định hướng thêm. Mỗi lớp có giới hạn riêng.

> **Tham chiếu version**
>
> Bài này audit Engineer Kit stable `claudekit-engineer@2.19.1` (release 2026-05-25).

> **Nếu bạn mới cân nhắc ClaudeKit**
>
> Đừng đọc guard rails như một cam kết kiểu "cài xong là agent không thể làm sai". Cách hiểu đúng hơn: CK thêm nhiều lớp phanh quanh Claude Code. Có lớp là phanh thật, hook chạy trước tool và có thể chặn luôn. Có lớp giống tờ note dán ngay trên bàn, rule và hard-gate được đưa vào context để Claude đi đúng quy trình. Hai lớp đều có ích, nhưng mức đảm bảo không giống nhau.
>
> Câu hỏi thực tế sau khi cài không phải "ClaudeKit có guard này không", mà là "guard này đang được gắn và đang bật trong repo của mình chưa".

Bài này đi từ khái niệm chung, rồi vào cách ClaudeKit Engineer (CK) hiện thực từng tầng: hook chạy code thật, rule được đưa vào context, HARD-GATE XML nằm trong skill markdown, guard skill do user chủ động gọi, kèm tình huống bắt được và các chỗ vẫn hở.


## Section 01: Guard rail là gì trong agentic coding

Guard rail là ràng buộc tự động đứng giữa agent và hành động của nó, chặn hoặc cảnh báo trước khi agent làm việc rủi ro. Có thể nghĩ nó như lan can ở mép cầu thang: nó không làm bạn đi giỏi hơn, nhưng ngăn một cú bước hụt thành tai nạn. Khác với một dòng lời dặn trong prompt (model tự đọc rồi tự làm theo), guard rail chạy ở tầng điều phối tool, không phụ thuộc model có "nhớ" hay không.

Vì sao agentic coding cần lớp này. Một coding agent không chỉ sinh text. Nó đọc file thật, ghi file thật, chạy shell command thật, mở PR thật. Mỗi tool call là một hành động có hậu quả. Một quyết định sai lan rộng nhanh:

- Đọc `node_modules/` để "hiểu thư viện" đốt vài chục nghìn token, làm context bẩn và kéo chất lượng các turn sau xuống
- `cat .env` để "check API key" đưa secret value vào transcript, từ đó có thể lộ tiếp sang log và PR
- Ship một diff 600 dòng chưa ai review vì agent thấy "code build pass là xong"

Model càng mạnh càng chủ động, mà chủ động sai thì hậu quả cũng lớn hơn. Lời dặn trong prompt vẫn có ích, nhưng nó chỉ là lời dặn. Khi context dài, khi user đổi yêu cầu, hoặc khi model hiểu lệch, lời dặn có thể trượt. Guard rail bù đúng khoảng đó: việc gì không được làm thì chặn ở runtime, không chỉ viết trong prompt.

### Phân biệt guard rail và lời dặn trong prompt

| | Guard rail | Lời dặn trong prompt |
|--|---------------------|----------------------|
| Chạy ở đâu | Harness, ngoài model | Trong context, model đọc |
| Ép buộc | Code chặn thật (block tool) | Model tự nguyện tuân |
| Khi context dài | Vẫn chạy | Dễ bị quên / trượt |
| Khi model hiểu lệch | Vẫn chặn (nếu không crash) | Lệch theo model |
| Sửa đổi | Cần đụng code/config | Sửa text là xong |

Hai thứ không loại trừ nhau. Việc rủi ro cao dùng guard rail, việc mang tính phong cách (commit format, comment convention) dùng lời dặn là đủ.


## Section 02: Guard rail hoạt động thế nào

### Harness là chỗ gắn guard rail

Coding agent không nói chuyện trực tiếp với filesystem. Giữa model và thế giới có một lớp điều phối gọi là harness. Nghĩ đơn giản: model nói "tôi muốn đọc file này", harness mới là người thật sự gửi lệnh đọc file, quản lý quyền, chạy hook lifecycle, rồi trả kết quả về cho model. Vì mọi hành động đều đi qua harness, đây là chỗ tự nhiên để gắn guard rail.

Có bốn điểm chèn chính:

| Điểm chèn | Lúc nào | Dùng để |
|-----------|---------|---------|
| Prompt gate | Khi nhận prompt user | Thêm context, chặn trước khi model chạy (ví dụ diff quá lớn thì chặn "ship") |
| Pre-tool hook | Trước khi tool chạy | Chặn đọc/ghi file cấm, chặn glob quá rộng |
| Post-tool hook | Sau khi tool chạy | Kiểm tra output, nhắc nhở, scan secret |
| Workflow gate | Giữa các phase | Buộc plan trước code, review trước ship |

### Flow một tool call qua guard rail

```
User prompt
    │
    ▼
┌─────────────┐   block?   ┌──────────────────────┐
│ Prompt gate │ ─────────► │ Chặn + nhắc user sửa  │
└─────────────┘            └──────────────────────┘
    │ pass
    ▼
┌─────────────┐
│   Model     │  quyết định gọi tool
└─────────────┘
    │ tool call (Read / Bash / Edit ...)
    ▼
┌──────────────┐  exit 2   ┌──────────────────────┐
│ Pre-tool hook│ ────────► │ Tool KHÔNG chạy       │
│ (scout/privacy)│         │ Trả lý do về model    │
└──────────────┘           └──────────────────────┘
    │ exit 0 (allow)
    ▼
┌──────────────┐
│  Tool exec   │  đọc/ghi/chạy thật
└──────────────┘
    │ result
    ▼
┌──────────────┐
│ Post-tool hook│  validate, scan, nhắc
└──────────────┘
    │
    ▼
  Result về Model
```

Điểm mấu chốt: pre-tool hook trả exit code. Exit 0 cho tool chạy, exit 2 chặn và đẩy lý do về cho model đọc. Model thấy "bị chặn vì lý do X" rồi chọn cách khác, thay vì cứ chạy tiếp.

### Hai kiểu chặn

- **Hard (code)**: hook trả exit 2, tool không chạy. Model không thể bỏ qua. Nhưng nếu hook crash (exit khác 2, thường là 1 hoặc bị signal), Claude Code coi đó là lỗi không chặn và cho tool chạy tiếp. Nghĩa là bug ở hook có thể làm guard tắt âm thầm. Đây là fail-open.
- **Soft (text)**: thêm một đoạn text vào context (rule, hard-gate). Model phải tự tuân. Mạnh hay yếu phụ thuộc model và độ rõ của lời dặn.

Cách an toàn hơn là xếp nhiều lớp: hard chặn việc tuyệt đối cấm, soft định hướng phần còn lại.

### Lợi ích

- **Giữ context sạch**: không cho đọc thư mục rác, các turn sau chất lượng hơn
- **Giữ secret khỏi transcript**: chặn đọc `.env`, `id_rsa` trước khi value xuất hiện trong log hội thoại
- **Giữ nhịp làm việc**: buộc plan trước code, simplify trước ship, review trước merge
- **Giảm sửa lại**: bắt lỗi ở lúc rẻ (trước khi ship) thay vì lúc đắt (sau khi merge)
- **Nhiều lớp bù nhau**: một lớp hở thì lớp khác còn đỡ

Đánh đổi luôn tồn tại: guard càng chặt thì càng dễ cản việc hợp lệ. Vì vậy guard rail tốt thường kèm đường mở rõ ràng (env var, config flag, user instruction). Phần dưới đi vào cách ClaudeKit hiện thực từng điểm chèn này.


## Section 03: Bảy nhóm guard rail trong CK

> **Ý chính**
>
> Guard rails trong CK gồm 2 lớp. Lớp **hook** chạy code thật: khi hook trả exit 2 thì tool không chạy, nhưng nếu hook crash thì Claude Code cho qua. Lớp **rule + hard-gate** là text trong context, mạnh hơn lời nhắc thường nhưng vẫn phụ thuộc Claude làm đúng. Hai lớp bù nhau, không thay nhau.
>
> Lưu ý quan trọng: CK tắt hộp thoại permission mặc định của Claude Code (`bypassPermissions: true`). Vì vậy việc chặn đọc file chủ yếu nằm ở hook layer. Hook crash thì lớp chặn đó mở ra mà không có hộp thoại gốc đứng sau đỡ.

| Nhóm | Cơ chế | Ví dụ | Mức ép buộc |
|------|--------|-------|-------------|
| Chặn file/path | Hook PreToolUse | scout-block, privacy-block | Code, fail-open trên crash |
| Chặn sai bước workflow | Hook UserPromptSubmit | simplify-gate, workflow-artifact-gate | Code |
| Thêm context | Hook UserPromptSubmit | dev-rules-reminder | Code, đưa text vào context |
| Giữ tên file/plan sạch | Hook PreToolUse, PostToolUse, SubagentStop | descriptive-name, plan-format-kanban, cook-after-plan-reminder | Code, cảnh báo/nhắc, fail-open |
| Hard-gate trong skill | XML trong skill markdown | `<HARD-GATE>` trong ck:cook, ck:fix | Lời dặn, model phải tuân |
| Rule dạng lời dặn | Markdown auto-load qua CLAUDE.md | review-audit-self-decision, team-coordination | Lời dặn |
| Guard skill user gọi | Skill chủ động user gọi | ck:security-scan, ck:predict, ck:scenario | Phụ thuộc user |

Phân biệt quan trọng: **hook** là code chạy ngoài model, có thể exit 2 chặn tool. Nhưng không phải hook nào cũng là hook chặn. `descriptive-name` chỉ nhắc cách đặt tên trước Write, `plan-format-kanban` chỉ cảnh báo format plan sau Edit/Write, `cook-after-plan-reminder` chỉ nhắc dừng lại sau Plan subagent. **Rule + hard-gate** là text được đưa vào context, Claude vẫn quyết định cuối. Khi bị bypass, các lớp lệch theo cách khác nhau.

### 9 tình huống quen thuộc mà các nhóm này bắt được

| Tình huống | Guard chặn |
|----------|-----------|
| Đọc `node_modules/react/...` để hiểu thư viện | scout-block PreToolUse, exit 2 |
| Đọc `.env` để check API key value | privacy-block, exit 2 kèm JSON prompt |
| Glob `**/*.ts` ở project root | scout-block broad-pattern, exit 2 kèm suggest narrow |
| Ship diff 600 LOC chưa simplify | simplify-gate UserPromptSubmit, chặn cứng (nếu gate enabled) |
| Implement auth feature thẳng không qua plan | ck:cook HARD-GATE, từ chối code trước plan |
| Reviewer suggest đổi threshold user đã chốt | review-audit-self-decision rule, buộc surface, không auto-apply |
| Hai agent cùng edit `src/api/routes.ts` | team-coordination rule, ownership violation stop |
| Ship khi thiếu `adversarial-validation.json` | workflow-artifact-gate (nếu bật), chặn cứng |
| Path traversal `../../.ssh/id_rsa` | privacy-block detect kèm `isSuspiciousPath()` |


## Section 04: Settings và các lớp config

Hai file config quyết định hook nào thực sự bật:

### Hai layer config

| File | Mục đích |
|------|----------|
| `~/.claude/settings.json` | Claude Code gốc: permission, allowed tools, base hooks |
| `~/.claude/.ck.json` | Riêng CK: enable/disable từng hook, kit metadata |

### settings.json gây hiểu nhầm

```json
{
  "bypassPermissions": true,
  "skipDangerousModePermissionPrompt": true
}
```

Nghĩa là hộp thoại permission gốc của Claude Code đã tắt hoàn toàn. Mọi file-access guard còn lại đều đi qua hook. Nếu hook crash theo thiết kế fail-open, agent vẫn đọc được file đáng ra bị chặn. Đây là đánh đổi lớn nhất của CK: giảm số prompt permission của Claude Code, đổi lại phải tin hook layer riêng hoạt động đúng.

### .ck.json enable/disable map

`DEFAULT_CONFIG.hooks` trong `lib/ck-config-utils.cjs:70-83` là enable flag mặc định, không phải toàn bộ hook wiring:

```
session-init: true
subagent-init: true
dev-rules-reminder: true
usage-context-awareness: true
context-tracking: true
scout-block: true
privacy-block: true
simplify-gate: true   (chú ý: xem Section 07)
task-completed-handler: true
teammate-idle-handler: true
session-state: true
workflow-artifact-gate: false (opt-in)
```

Tắt từng hook: set `false` trong `~/.claude/.ck.json` hoặc project `.claude/.ck.json`.

**Cách gộp config:** project config được merge vào global. Cùng key thì project thắng global. Khác key thì cộng dồn. Nghĩa là disable một hook ở project không cần xoá khỏi global, ngược lại bật hook bị global tắt thì project có thể override.

### Hook đang được gắn trong v2.19.1

`settings.json` của stable v2.19.1 gắn các hook sau:

| Lifecycle | Hook đang chạy | Vai trò |
|-----------|-------------|---------|
| SessionStart | session-init, usage-quota-cache-refresh | Detect project/session, refresh usage cache |
| UserPromptSubmit | simplify-gate, dev-rules-reminder, usage-quota-cache-refresh | Gate ship/merge prompt, đưa dev rules vào context, refresh quota cache |
| SubagentStart | subagent-init | Đưa context tối thiểu cho subagent |
| PreToolUse | descriptive-name (Write), scout-block, privacy-block | Naming guidance, chặn path rác, chặn secret |
| PostToolUse | plan-format-kanban, session-state, usage-quota-cache-refresh | Cảnh báo format plan, cập nhật state/statusline, refresh quota cache |
| SubagentStop | cook-after-plan-reminder, session-state | Nhắc bước kế tiếp sau Plan subagent, lưu state |
| Stop | session-state | Lưu state cuối session |

Một số hook file có trong source nhưng không được gắn mặc định trong `settings.json` stable, ví dụ `workflow-artifact-gate.cjs`, `team-context-inject.cjs`, `task-completed-handler.cjs`, `teammate-idle-handler.cjs`, `usage-context-awareness.cjs`. Riêng `workflow-artifact-gate` vẫn là guard quan trọng, nhưng mặc định tắt/opt-in nên bài này tách riêng ở Section 08.

Một chi tiết dễ miss: `isHookEnabled()` trả `true` nếu hook name không có trong `.ck.json`. Nghĩa là hook đã được gắn trong `settings.json` nhưng không xuất hiện trong `DEFAULT_CONFIG.hooks` vẫn chạy, trừ khi user set hook đó thành `false`.

Cách tắt khẩn cấp bằng env:

- `CK_SIMPLIFY_DISABLED=1`
- `CK_WORKFLOW_ARTIFACT_GATE_DISABLED=1`

### Cách check hook đang chạy hay đang mở vì fail-open

Claude Code log stderr của hook ra terminal khi hook crash. Hai cách phổ biến:

1. Chạy Claude Code trong terminal session, stderr của hook hiện trực tiếp trong console khi prompt kích hoạt hook
2. Tail session log directory để xem hook output

Nếu hook code crash, output sẽ có stack trace. Không thấy stack trace đồng nghĩa hook không crash, nhưng không đảm bảo hook đã chạy. Hook có thể bị disable trong config hoặc bỏ qua vì điều kiện kích hoạt không khớp. Để xác nhận hook chạy thật, đặt một `console.error('[hook-name] fired')` ở đầu hook code và check stderr.

### Sanitize path trong config loader

`sanitizePath()` (`lib/ck-config-utils.cjs:492-516`) chặn null byte và `../` traversal trong giá trị path tương đối của config. Quan trọng vì project `.ck.json` được merge với global. Nếu một project không tin cậy kiểm soát config, nó có thể cố nhét path thoát ra ngoài repo. Sanitize trước khi merge là cách chặn nhóm lỗi đó.


## Section 05: scout-block, chặn đọc thư mục rác

### Vấn đề mà scout-block giải quyết

Agent rất hay làm kiểu này:

- "Để mình đọc `node_modules/react/` xem implementation"
- "Glob `**/*.ts` ở root cho biết codebase có gì"
- "Cat thử `dist/index.js` xem build ra sao"

Mỗi lần như vậy là vài chục nghìn token bị nhét vào context window, kéo theo cost và làm chất lượng các turn sau kém đi. Tệ hơn, kết quả từ `node_modules` ô nhiễm context. Agent bắt đầu dựa vào code thư viện thay vì source code của project.

### Cơ chế

`scout-block.cjs` đăng ký dưới PreToolUse, chạy trước mọi Read/Bash/Glob/Grep.

Pipeline:

1. Load `.ckignore` baseline đi kèm CK (`~/.claude/.ckignore`) cộng project-local `.claude/.ckignore` nếu có
2. Parse bằng package `ignore` (gitignore-spec)
3. Lấy path từ `tool_input.file_path`, `tool_input.path`, hoặc bash command qua `path-extractor.cjs`
4. Hai cách phát hiện:
   - Match path: nếu path hit `.ckignore` pattern thì exit 2
   - Pattern quá rộng: nếu Glob dùng `**/*.ts`, `**/*`, `*.*` ở project root thì exit 2 kèm gợi ý thu hẹp pattern

Các thư mục bị chặn mặc định (`pattern-matcher.cjs:15-34`): `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `__pycache__`, `.venv`, `venv`, `vendor`, `target`, `.git`, `coverage`.

### Allowlist quan trọng

Có một exception phải biết: **build commands luôn được cho qua**. `BUILD_COMMAND_PATTERN` trong `lib/scout-checker.cjs:25` cho `npm build`, `go build`, `cargo build`, `make`, `docker build` đi qua mặc dù chúng có thể chạm `node_modules` hoặc `dist`. Nếu chặn build thì cả ck:ship cũng chết.

### Khi hook crash

Fail-open: bất kỳ parse error hoặc exception lạ đều dẫn tới exit 0, tool được cho qua. Đây là lựa chọn ưu tiên session không bị kẹt hơn là chặn tuyệt đối. Nếu hook code có bug, guard rail cho lớp đó tắt âm thầm, agent đọc thoải mái. Đây là gap đầu tiên cần biết.


## Section 06: privacy-block, chặn đọc secret kèm approval flow

### Vấn đề

Cùng nhóm vấn đề với scout-block nhưng phạm vi khác: agent đụng `.env`, `id_rsa`, `*.pem`, `credentials.yaml`. Đây không phải "context rác", đây là **secret lộ vào transcript**. Một khi secret value vào context, nó có thể bị log, bị quote lại trong code reviewer output, hoặc bị paste vào PR description.

### Cơ chế

`privacy-block.cjs` đăng ký dưới PreToolUse cho Read/Write/Edit (và chỉ cảnh báo cho Bash):

1. `lib/privacy-checker.cjs` so path với danh sách sensitive pattern bằng regex:
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

Flow này được tài liệu hoá trong CLAUDE.md global, không phải convention ngầm. Nó tận dụng `AskUserQuestion` để buộc user approval rõ ràng thay vì để model tự diễn dịch consent.

### Có thêm pattern secret được không

Danh sách pattern được hard-code trong `lib/privacy-checker.cjs:28-39`. Nếu repo có file secret riêng (ví dụ `vault-credentials.json`), không có config public nào của hook để thêm pattern. Hai cách xử lý:

1. Đặt file vào path khớp regex sẵn có (ví dụ rename thành `*-credentials.*`)
2. Fork hook hoặc patch `PRIVACY_PATTERNS` array local

Không có config flag kiểu `privacyBlock.extraPatterns` ở thời điểm bài này viết.

### Ngoại lệ Bash, gap rất rõ

`privacy-block.cjs:133` cho Bash tool đi qua, chỉ cảnh báo. Lý do là flow "user duyệt thì dùng bash cat <file>" cần Bash chạy được, mà Bash thường được auto-approve theo policy. Tác dụng phụ: bất kỳ ai đã có quyền chạy Bash đều có thể đọc secret mà không qua approval flow. Đây là gap thứ hai.

### Nếu đã leak rồi

Privacy-block chỉ chặn READ. Khi secret đã vào transcript, file không thể "rút lại". Việc cần làm:

1. Rotate credential ngay (đổi API key, regenerate token)
2. Audit conversation log directory của Claude Code để xác định mức leak
3. Check git history xem secret có bị commit vô tình không, nếu có thì rewrite history

Tốt nhất không tin "privacy-block đã bảo vệ", luôn rotate khi nghi ngờ.


## Section 07: simplify-gate, chặn ship diff quá to

### Vấn đề

Tình huống hay gặp: feature branch dài 2 tuần, diff 800 LOC, agent nói "OK, mình ship". Code chưa qua simplify pass, có khả năng vẫn còn dead code, abstraction sớm, helper không ai gọi. Một khi merge thì rollback đắt.

### Cơ chế

`simplify-gate.cjs` đăng ký dưới UserPromptSubmit. Hook không giữ state; mỗi lần chạy nó đọc `git diff HEAD`.

Hook chỉ xét khi prompt user có các từ: `ship`, `merge`, `pr`, `deploy`, `publish`.

Ngưỡng chặn cứng (theo default):

- Tổng diff > 400 LOC, hoặc
- Số file đụng > 8, hoặc
- Một file đơn lẻ > 200 LOC

> **Chú ý:** Cài mặc định là trạng thái ngủ. Hook script có chạy, nhưng gate chưa block gì. Cần `simplify.gate.enabled = true` trong project config để thực sự bật. Chi tiết ở dưới.

Output khi block:

> Diff vượt ngưỡng simplify. Chạy code-simplifier trước khi ship.

Cảnh báo mềm (không block) khi prompt có `commit`, `finalize`, `release`. Cảnh báo nhưng cho qua.

### Cảnh báo quan trọng về default

`DEFAULT_CONFIG.hooks['simplify-gate'] = true` chỉ nghĩa **script được phép chạy**. Bên trong, `DEFAULTS.gate.enabled = false` (`simplify-gate.cjs:19`). Hook chạy xong sẽ exit ngay ở line 160 nếu `gate.enabled === false`. Kết quả: install mặc định không block gì.

Để bật thật sự, project config cần ghi rõ:

```json
{
  "simplify": { "gate": { "enabled": true } }
}
```

`.ck.json` hooks map nói `true` (script chạy), nhưng config con của gate mặc định `false` (không block). Audit cả hai layer trước khi tin simplify-gate đang bảo vệ.

### Cách lệch ngoài ý muốn

`matchedSeverity()` (`simplify-gate.cjs:39-51`) bỏ qua vài cách diễn đạt: `"don't ship"`, `"do not ship"`, `"ship on"`. Mục đích là khi user nói chuyện meta về ship ("don't ship yet, let me review first"), hook không bật. Tác dụng phụ: một câu tự nhiên như "ship on Friday" cũng đi qua.

### Tắt khẩn cấp

Khi cần ship gấp bỏ qua gate: set env var `CK_SIMPLIFY_DISABLED=1`. Đây là chủ ý thiết kế. Guard rail không nên block 100% mọi lúc, sẽ có lúc user biết rõ họ làm gì và cần override.


## Section 08: workflow-artifact-gate, kiểm tra 5 artifact JSON

### Vấn đề

Khi team chạy full pipeline (plan, cook, review, adversarial, ship), mỗi phase nên để lại một file JSON ghi quyết định. Có thể xem các file này như hoá đơn sau mỗi bước: thiếu hoá đơn thì không biết ai đã kiểm gì, pass vì sao, còn rủi ro nào chưa xử lý. Ship trong tình trạng này là ship khi thiếu bằng chứng.

### Cơ chế

`workflow-artifact-gate.cjs` được thiết kế để gắn vào UserPromptSubmit và PreToolUse(Bash), nhưng stable `settings.json` không wired mặc định. Mặc định **off**, muốn dùng phải bật rõ.

5 file JSON cần có trước ship/push/pr/deploy:

| Artifact | Phase tạo | Nội dung |
|----------|-----------|----------|
| `context-snippets.json` | scout/plan | Snippet code đã đọc |
| `risk-gate.json` | predict | High-risk flag, auto-stop required |
| `verification.json` | fix/cook | 5-point verification checklist pass |
| `review-decision.json` | code-review | Reviewer verdict |
| `adversarial-validation.json` | adversarial | Adversarial pass |

### Cách hook tìm thư mục artifact

`artifact-locator.cjs` tìm theo 4 bước, dừng ở bước đầu tiên khớp:

1. CLI flag `--artifact-dir <path>` truyền vào hook
2. Env var `CK_WORKFLOW_ARTIFACT_DIR`
3. Pointer file `.claude/workflow-artifacts.json` ở project root
4. Fallback scan `plans/reports/harness/` subdirs, lấy thư mục modified gần nhất trong 24h

Nếu bước 4 trả về nhiều harness dir gần đây, hook không chọn được và user phải set env var rõ ràng. Hook **không** đọc path từ context của Claude. `dev-rules-reminder` đưa report path vào lời dặn cho subagent, nhưng `workflow-artifact-gate` tự tìm theo chuỗi trên.

Kiểm tra:

- Schema check: `validateRiskGate` kiểm tra `highRisk=true → autoStopRequired=true` (`artifact-schema.cjs:44-58`)
- Secret scan trong nội dung artifact: AWS keys, GitHub tokens, OpenAI keys, private key headers (`validator.cjs`)
- Hard stages (ship/push/pr/deploy): `emitBlock()`, continue false, Claude Code stop
- Soft stages (finalize/commit): `emitSoft()`, warning, không stop

### Vì sao opt-in

Với task nhỏ, ép có đủ 5 artifact dễ thành nặng tay. Mặc định off nghĩa là chỉ team nào thật sự muốn kỷ luật này mới bật. Đổi lại, ai muốn gate chặt phải bật rõ trong config.


## Section 09: Hard-gate XML trong skill markdown

### Vấn đề

Hook chỉ chặn được tool call. Có những loại lỗi không phải tool call mà là **trình tự**: code trước plan, fix trước scout, ship trước review. Cách CK xử lý là gắn `<HARD-GATE>` XML block vào skill markdown.

### Ví dụ trong ck:cook (`cook/SKILL.md:46-51`)

Trước khi xem ví dụ, lưu ý: HARD-GATE tôn trọng yêu cầu rõ ràng của user. Có dòng "User override" trong định nghĩa, nghĩa là model được phép bỏ qua gate nếu user yêu cầu tường minh. Nó là lời dặn rất mạnh, nhưng không cứng như hook.

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

Chữ "hard" ở đây dễ gây hiểu nhầm. Nó không phải chặn bằng code. Đây là lời dặn trong prompt, Claude vẫn phải tự làm theo. Khác với hook ở chỗ: nếu model bỏ qua HARD-GATE, không có exit 2 nào chặn. Cách bọc XML và tên "HARD-GATE" tạo signal mạnh hơn rule thường để model khó tự hợp lý hoá việc đi tắt. Nhưng vẫn không phải hook, model hiểu lệch vẫn có thể đi sai.


## Section 10: Rules auto-load qua CLAUDE.md

### Cơ chế thêm rule vào context

`dev-rules-reminder.cjs` đăng ký UserPromptSubmit, build context qua `lib/context-builder.cjs`, rồi đưa rules text vào mỗi prompt. TTL 5 phút theo `(sessionId, baseDir)` để tránh đốt token. Điều kiện trước đó: rules phải được khai báo trong global CLAUDE.md.

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

Rules là **text trong context**, không phải code. Hệ quả:

- Claude có thể đọc nhưng vẫn lệch nếu prompt user đè
- Không có chặn ở tầng code, không exit 2 nào ép
- Sức mạnh phụ thuộc model. Model yếu có khả năng bỏ qua rule cao hơn, model mạnh tuân tốt hơn

Bù lại: rule rất dễ thêm/sửa, không cần redeploy. Phù hợp cho quy ước phong cách (commit format, comment convention) hơn là guard bảo mật.


## Section 11: Guard skills, lớp guard chủ động user gọi

Gọi bằng slash command trong Claude Code chat (`/ck:security-scan`, `/ck:predict`, v.v.).

| Skill | Khi dùng | Bắt cái gì |
|-------|----------|-----------|
| `ck:security-scan` | Pre-release | Hardcoded secret (AWS/GitHub/Stripe), npm audit CVE, SQL injection, XSS, command injection, path traversal, `.env` tracked in git |
| `ck:predict` | Trước feature rủi ro | 5 persona (Architect, Security, Perf, UX, Devil's Advocate) debate, verdict GO/CAUTION/STOP |
| `ck:scenario` | Pre-implementation | 12-dimension edge case sweep: auth, timing/race, input extreme, GDPR, compliance, business edge case |
| `ck:fix` (4 hard-gate) | Bug / CI failure | Scout-first, root-cause-first, blast-radius proof, plus Anti-Rationalization section |
| `ck:cook` (4 hard-gate) | Feature implementation | Plan-first, scout-first, requirement-first, no-side-effects |
| `ck:ship` | Pre-PR pipeline | Stop on test failure, critical review, major version bump, merge conflict. Never force-push |

`ck:security-scan` không output raw secret value, kể cả khi tìm thấy. Chỉ report location cộng redacted snippet. Scan ra secret rồi để raw value trong report là tự tạo thêm leak.

`code-reviewer` agent chạy checklist 9 mục: concurrency, error boundary, API contract, backwards compat, input validation, auth/authz, N+1, data leak, fact-check plan claim vs codebase. Đây là guard cuối trước merge.


## Section 12: Các gap đã biết

Danh sách này để tránh tin quá mức.

1. **`bypassPermissions: true` đồng nghĩa mọi file-access guard phụ thuộc hook**. Hook crash đồng nghĩa lớp đó mở. Privacy-block và scout-block đều exit 0 khi gặp lỗi bất thường.
2. **Bash exempt khỏi privacy-block** (`privacy-block.cjs:133` chỉ warn). Bất kỳ approved Bash flow nào đều bypass được approval prompt.
3. **workflow-artifact-gate default off** (`DEFAULT_CONFIG.hooks["workflow-artifact-gate"]: false`). User không bật thì gate mạnh nhất không chạy.
4. **simplify-gate mặc định ở trạng thái ngủ**. Hook chạy nhưng `DEFAULTS.gate.enabled = false`. Cần bật rõ qua project config (xem Section 07).
5. **simplify-gate dễ trượt qua bằng phrasing**. `"ship on Friday"`, `"don't ship"` đều exempt. Một câu nói tự nhiên, dù không cố ý bypass, vẫn có thể đi qua.
6. **`.ckignore` baseline có thể negate `node_modules`**. Trong install hiện tại của tôi, `~/.claude/.ckignore` chỉ có một dòng `!node_modules`, allowlist `node_modules` trở lại. Default pattern khác trong `pattern-matcher.cjs` vẫn block. Kiểm tra `~/.claude/.ckignore` trực tiếp trước khi tin scout-block chặn `node_modules` ở install của bạn.
7. **Rules là lời dặn, không phải code**. development-rules, team-coordination, review-audit-self-decision đều đưa text vào context. Claude có thể lệch. Không exit 2 nào ép.
8. **HARD-GATE XML cũng là lời dặn**. `<HARD-GATE>` trong skill markdown phụ thuộc Claude tuân. `--fast` mode có thể skip research gate. Mỗi hard-gate cũng có dòng "User override" cho phép user instruction rõ ràng đi qua.

### Không có rate-limit / quota guard

Một agent chạy mất kiểm soát có thể call hàng nghìn Read/Glob/Bash. Hook không đếm, không throttle. Guard chặn chi phí không phải mục tiêu thiết kế của hook layer này, đó là việc của lớp billing/limit phía trên Claude Code.


## Section 13: Best practices và pitfalls

### Best practices

- Đọc cả `settings.json` và `~/.claude/.ck.json` ngay sau khi cài CK: một file quyết định hook được gắn vào lifecycle nào, file còn lại quyết định hook nào bị disable
- Bật `workflow-artifact-gate` cho repo nào ship production code. Opt-in nhưng đáng
- Nếu muốn simplify-gate thực sự block, set `simplify.gate.enabled = true` trong project `.ck.json`
- Cần đọc `node_modules` thật (debug thư viện): tạo project `.ckignore` override thay vì disable scout-block toàn cục
- Khi privacy-block prompt approval `.env`, đọc kỹ prompt trước khi duyệt, đừng auto-yes
- Custom rule file mới: thêm vào CLAUDE.md global thay vì hi vọng Claude tự nhớ. Không được đưa vào context thì rule không có hiệu lực

### Pitfalls

- Nghĩ `bypassPermissions: false` là default. Không phải, CK cài sẵn `true` để giảm prompt permission
- Tin simplify-gate đang chặn diff lớn. Mặc định gate ở trạng thái ngủ, cần bật rõ
- Tin hook không bao giờ fail. Thiết kế fail-open, crash đồng nghĩa lớp đó mở
- Tin rule là code-enforced. Rule là text trong context, Claude có thể lệch
- Bật full workflow-artifact-gate cho task nhỏ. Dễ nặng tay, nhiều bước thừa
- Disable scout-block để đọc một file rồi quên bật lại. Rất dễ xảy ra
- Đặt secret value vào commit message rồi tin privacy-block chặn. Privacy-block chặn READ, không chặn commit

### 6 câu kiểm tra trước khi tin guard rail

- [ ] `settings.json` đang gắn hook nào vào lifecycle nào?
- [ ] `.ck.json` đã disable hook nào? (Cả outer flag và inner config)
- [ ] `bypassPermissions` trong `settings.json` đang là gì?
- [ ] Có project `.ckignore` override không? Đặc biệt `node_modules` có bị `!` allowlist không?
- [ ] Rule files trong CLAUDE.md có đầy đủ không?
- [ ] Có hook nào đang crash âm thầm trong session này không (check stderr)?


## Tóm tắt

Khi đụng task lớn, kiểm tra config trước, đừng cho rằng "CK đã cài là an toàn". Một install có thể có `node_modules` allowlist riêng, một install khác có thể chưa gắn hoặc chưa bật `workflow-artifact-gate`, một install thứ ba có thể chưa bật `simplify.gate.enabled`. Audit `settings.json` + `.ck.json` rẻ hơn audit lại bug sau ship.

Bốn lớp guard rail bù nhau theo cách khác nhau: hook crash thì lớp đó tắt âm thầm, rule có thể bị prompt user đè qua, hard-gate XML tôn trọng user override rõ ràng, guard skill chỉ chạy khi user chủ động gọi. Biết giới hạn từng lớp giúp tin đúng chỗ.
