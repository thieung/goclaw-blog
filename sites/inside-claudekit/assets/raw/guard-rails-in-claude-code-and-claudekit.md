---
title: "Guard rails: lớp phanh giữa model và hành động"
description: "Guard rail trong agentic coding là gì, vì sao chỉ dặn prompt là chưa đủ, và cách ClaudeKit chặn hành động rủi ro bằng hook, rule, hard-gate và guard skill"
series: "Inside ClaudeKit"
product: "ClaudeKit Engineer"
project: claudekit
version: "claudekit-engineer@2.19.1"
status: approved
created: 2026-05-26
slug: guard-rails-in-claude-code-and-claudekit
tags: [claudekit, hooks, safety, guard-rails, internals]
---

# Guard rails: lớp phanh giữa model và hành động

Khi agent có quyền đọc file, chạy shell, sửa code và ship PR, một dòng dặn trong prompt là chưa đủ. Cần một lớp kiểm tra trước khi tool thật sự chạy.

Case xuyên suốt: **một task nhỏ, nhiều quyền quá rộng**.

Bạn giao cho agent một việc nhỏ: sửa validation trong một module. Nó muốn chắc hơn nên quét thêm vài thư mục, mở file config nhạy cảm, rồi tiện tay gom luôn vài cleanup không liên quan vào cùng một PR.

Nhìn qua thì mọi thứ vẫn ổn. Test vẫn pass. Nhưng context đã lẫn file rác, secret có thể đã đi vào transcript (toàn bộ bản ghi hội thoại giữa bạn và agent), còn review thì bị loãng vì phần cần sửa và phần "tiện tay" nằm chung một PR.

| Không guard rail | Có guard rail |
|------------------|---------------|
| Glob quá rộng, context bẩn | Glob rộng, `scout-block` exit 2 |
| `cat .env`, secret vào transcript | `.env`, `privacy-block` hỏi user |
| Cleanup ngoài scope, review bị loãng | Scope lệch, rule/hard-gate nhắc quay lại task chính |
| Test pass nên làm tiếp | Trước khi ship, simplify/review gate kiểm tra lại diff |

Agent không tự nhiên cẩn thận hơn. Chỉ là trước khi nó làm gì đó, có một lớp đứng ra hỏi: việc này có nên được phép chạy không?

> **Ý chính**
>
> Hook là lớp chặn thật.
>
> Guard rail không làm model thông minh hơn. Nó kiểm tra hành động trước khi tool chạy. Rule, hard-gate và guard skill là các lớp định hướng thêm, hữu ích nhưng vẫn phụ thuộc model hoặc user có gọi hay không.

> **Tham chiếu version**
>
> Bài này audit Engineer Kit stable `claudekit-engineer@2.19.1` (release 2026-05-25).
>
> Update 2026-06-09: `claudekit-engineer@2.19.2-beta` đang chuẩn bị remove 2 hook Agent Teams: `task-completed-handler` và `teammate-idle-handler`. Vì vậy phần danh sách hook bên dưới nên đọc như snapshot theo stable `2.19.1`; khi upstream ClaudeKit release new version, danh sách này có thể còn 14 hook.

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

**Harness** là lớp runtime bọc quanh model. Model chỉ quyết định "tôi muốn đọc file này" hoặc "tôi muốn chạy lệnh này"; harness mới là bên nhận tool call, quản quyền, gọi hook, cho tool chạy hoặc chặn, rồi trả kết quả lại cho model.

**Hook** là script nhỏ harness tự gọi tại các thời điểm cố định trong vòng đời một prompt/tool/session để xen vào kiểm tra hoặc ghi state. Vì mọi hành động thật đều qua harness, đây là chỗ gắn guard rail.

Đọc thêm nền khái niệm: [Harness Engineering là gì?](https://goonnguyen.substack.com/p/harness-engineering-la-gi) của Duy /zuey/.

### Bản đồ ClaudeKit hooks

Ở mức lifecycle, CK gắn hook vào các mốc chính:

| Lifecycle | Hook tiêu biểu | Vai trò |
|-----------|----------------|---------|
| `UserPromptSubmit` | `simplify-gate`, `dev-rules-reminder` | Chặn hoặc inject context ngay khi nhận prompt |
| `PreToolUse` | `scout-block`, `privacy-block`, `descriptive-name` | Chặn hoặc nhắc trước khi tool thật chạy |
| Tool chạy thật | Read, Bash, Edit, Write | Hành động thật trên máy |
| `PostToolUse` | `plan-format-kanban`, `session-state` | Validate, warn, ghi state sau tool |
| `Stop` / `SubagentStop` | `session-state`, `cook-after-plan-reminder` | Ghi state hoặc nhắc bước kế tiếp khi session/subagent kết thúc |

Output của hook có thể: cho chạy, chặn, inject context, hoặc ghi logs/state/artifact.

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

Điểm mấu chốt: pre-tool hook trả exit code. **Exit 0** cho tool chạy, **exit 2** chặn và đẩy lý do về model. Ba điểm chèn chính trong flow có tên kỹ thuật tương ứng: `UserPromptSubmit` (lúc nhận prompt), `PreToolUse` (trước tool), `PostToolUse` (sau tool). Riêng `Stop` / `SubagentStop` chạy khi session hoặc subagent kết thúc.

### Exit code nghĩa là gì

Exit code là số process trả về khi kết thúc. Claude Code đọc nó để quyết tool có chạy không:

- `exit 0`: OK, tool chạy. stdout đọc làm JSON output.
- `exit 2`: **chặn**. Bỏ stdout, đẩy stderr về model làm thông báo lỗi.
- `exit 1` hoặc mã khác: **lỗi nhưng không chặn**. Báo lỗi rồi tool vẫn chạy tiếp.

Chỉ `exit 2` mới chặn thật. Hook muốn enforce policy phải dùng đúng `exit 2`. Dùng nhầm `exit 1` theo thói quen Unix là guard tưởng bật mà thực ra mở.

### Hai kiểu chặn

- **Hard (code)**: hook exit 2, tool không chạy. Nhưng hook crash thì Claude Code cho qua (`fail-open`). Bug ở hook làm guard tắt âm thầm.
- **Soft (text)**: thêm text vào context (rule, hard-gate). Model phải tự tuân. Mạnh hay yếu phụ thuộc model.

Cách an toàn hơn là xếp nhiều lớp: hard chặn việc tuyệt đối cấm, soft định hướng phần còn lại.

### Lợi ích

- Giữ context sạch, giữ secret khỏi transcript.
- Giữ nhịp: plan → simplify → review.
- Chặn sớm trước khi rủi ro lan ra: agent định đọc `.env`, quét quá rộng, hoặc kéo cleanup ngoài scope vào PR.
- Nhiều lớp bù nhau: hook có thể fail-open, rule có thể bị model bỏ qua, guard skill có thể không được gọi; tách thành nhiều lớp giúp giảm phụ thuộc vào một điểm chặn duy nhất.

Đánh đổi luôn tồn tại: guard càng chặt thì càng dễ cản việc hợp lệ. Vì vậy guard rail tốt thường kèm đường mở rõ ràng (env var, config flag, user instruction). Phần dưới đi vào cách ClaudeKit hiện thực từng điểm chèn này.


## Section 03: Bảy nhóm guard rail trong CK

> **Lưu ý quan trọng**
>
> Sau một fresh CK install, file-access guard nằm ở `PreToolUse` hook như `scout-block` và `privacy-block`. Nếu phiên Claude Code đang chạy ở mode bỏ qua permission prompt, các hook này vẫn là lớp chặn chính của CK. Nhưng hook CK là **fail-open**: crash hoặc bị disable thì tool call có thể đi tiếp.

| Nhóm | Cơ chế | Ví dụ | Mức ép buộc |
|------|--------|-------|-------------|
| Chặn file/path | PreToolUse | `scout-block` | Code, fail-open |
| Chặn sai bước | UserPromptSubmit | `simplify-gate` | Code |
| Thêm context | UserPromptSubmit | `dev-rules-reminder` | Code |
| Giữ tên sạch | Pre/Post/Stop | `descriptive-name` | Code, nhắc |
| Hard-gate skill | XML markdown | `<HARD-GATE>` | Lời dặn |
| Rule lời dặn | CLAUDE.md | `review-audit` | Lời dặn |
| Guard skill | User gọi | `ck:security-scan` | User |

### Nhóm nào đọc ở đâu

| Nhóm | Đọc ở đâu |
|------|-----------|
| Chặn file/path | `scout-block`, `privacy-block` · Section 05-06 |
| Chặn sai bước | `simplify-gate`, workflow gate · Section 07-08 |
| Thêm context | `dev-rules-reminder` inject text vào prompt · Section 10 |
| Giữ tên sạch | `descriptive-name` · hook grid trong Section 04 |
| Hard-gate skill | `<HARD-GATE>` · Section 09 |
| Rule lời dặn | `CLAUDE.md` rules là nội dung được inject · Section 10 |
| Guard skill | `ck:security-scan`, `ck:ship` · Section 11 |

### 9 tình huống quen thuộc mà các nhóm này bắt được

| Tình huống | Guard chặn |
|----------|-----------|
| Đọc `node_modules/react/` | `scout-block`, exit 2 |
| Đọc `.env` check key | `privacy-block`, exit 2 + approval prompt |
| Glob `**/*.ts` ở root | `scout-block` broad-pattern |
| Prompt ship khi diff đã phình to | `simplify-gate`, nếu `gate.enabled=true` |
| Bắt đầu code khi chưa có plan/review | `ck:cook` HARD-GATE |
| Đổi threshold user đã chốt | `review-audit` rule: hỏi lại trước khi đổi |
| File mới tên mơ hồ | `descriptive-name`, PreToolUse(Write) |
| Plan dùng link/text sai format | `plan-format-kanban`, PostToolUse(Edit/Write/MultiEdit) |
| Hai teammate đụng cùng file | `team-coordination` rule, chỉ trong Agent Team |


## Section 04: Settings và các lớp config

Hai lớp config quyết định guard nào chạy: `settings.json` gắn hook vào lifecycle của Claude Code; `.ck.json` bật/tắt từng hook và chỉnh threshold.

| Scope | File |
|-------|------|
| Global | `~/.claude/settings.json`, `~/.claude/.ck.json`, `~/.claude/hooks/*.cjs` |
| Project | `.claude/settings.json`, `.claude/.ck.json`, `.claude/hooks/*.cjs` |

### settings.json: hook nào chạy ở mốc nào

Snippet dưới đây chỉ minh hoạ một lát cắt `PreToolUse` trong fresh CK install: CK cung cấp `scout-block` và `privacy-block`, rồi wire chúng vào lifecycle để Claude Code gọi trước khi tool chạy. Full hook config trên máy đã cài còn nhiều lifecycle event hơn; nơi cần xem là `settings.json` của Claude Code.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Glob|Grep|Read|Edit|Write",
        "hooks": [
          { "command": "node \".claude/hooks/scout-block.cjs\"" },
          { "command": "node \".claude/hooks/privacy-block.cjs\"" }
        ]
      }
    ]
  }
}
```

`settings.json` là bản đồ lifecycle: khi user gửi prompt thì hook nào chạy, trước khi tool chạy thì hook nào được gọi, sau khi tool xong thì hook nào xử lý tiếp. Với global install, CLI đổi command tương đối trong template thành dạng `node "$HOME/.claude/hooks/scout-block.cjs"`; với project install, path thường giữ ở dạng `.claude/hooks/...`.

### Đọc hook theo 3 nhãn

Đừng gom mọi thứ thành "mặc định bật/tắt". Trạng thái của một hook có ba lớp khác nhau:

| Nhãn | Nghĩa khi audit |
|------|-----------------|
| `script file` | File `.cjs` có nằm trong `.claude/hooks/`. Có file chưa có nghĩa là hook đang chạy. |
| `wired` | `settings.json` đã gắn script vào lifecycle event của Claude Code. Không wire thì Claude Code không tự gọi hook đó. |
| `runtime flag` | Khi hook đã được gọi, code bên trong đọc `.ck.json` / default config / ENV để quyết định có chạy tiếp không. Một vài guard còn có công tắc con như `privacyBlock` hoặc `simplify.gate.enabled`. |

### Hook đang được gắn trong install hiện tại

| Lifecycle | Hook đang chạy | Vai trò |
|-----------|-------------|---------|
| SessionStart | session-init, usage-quota-cache-refresh | Detect project/session, refresh usage cache |
| UserPromptSubmit | simplify-gate, dev-rules-reminder, usage-quota-cache-refresh | Gate ship/merge prompt, đưa dev rules vào context, refresh quota cache |
| SubagentStart | subagent-init | Đưa context tối thiểu cho subagent |
| PreToolUse | descriptive-name (Write), scout-block, privacy-block | Naming guidance, chặn path rác, chặn secret |
| PostToolUse | plan-format-kanban, session-state, usage-quota-cache-refresh | Cảnh báo format plan, cập nhật state/statusline, refresh quota cache |
| SubagentStop | cook-after-plan-reminder, session-state | Nhắc bước kế tiếp sau Plan subagent, lưu state |
| Stop | session-state | Lưu state cuối session |

### Danh sách hook script trong `.claude/hooks/`

| Hook | Lifecycle / trạng thái | Ghi chú |
|------|------------------------|---------|
| `session-init` | SessionStart · wired | Project/env setup khi startup, resume, clear, compact |
| `usage-quota-cache-refresh` | SessionStart · UserPromptSubmit · PostToolUse · wired | Không đọc hook flag riêng; chạy khi được wire |
| `simplify-gate` | UserPromptSubmit · wired, gate off | Script được gọi, nhưng `simplify.gate.enabled` mặc định false |
| `dev-rules-reminder` | UserPromptSubmit · wired | Inject dev rules/context |
| `subagent-init` | SubagentStart · wired | Inject context cho subagent |
| `descriptive-name` | PreToolUse(Write) · wired | Nhắc đặt tên file/script rõ nghĩa |
| `scout-block` | PreToolUse(Bash/Glob/Grep/Read/Edit/Write) · wired | Chặn heavy dirs và glob quá rộng |
| `privacy-block` | PreToolUse(Bash/Glob/Grep/Read/Edit/Write) · wired | Chặn secret path, hỏi approval; còn đọc `privacyBlock` |
| `plan-format-kanban` | PostToolUse(Edit/Write/MultiEdit) · wired | Warn format plan, không đọc hook flag riêng |
| `session-state` | PostToolUse · SubagentStop · Stop · wired | Ghi trạng thái session/task |
| `cook-after-plan-reminder` | SubagentStop(Plan) · wired | Key thiếu vẫn enabled, chỉ tắt khi set false |
| `workflow-artifact-gate` | not wired | Opt-in cho artifact gate: cần wire hook và bật flag/gate config |
| `task-completed-handler` | TaskCompleted · chuẩn bị remove trong 2.19.2-beta | Agent Teams task completed; không nên coi là hook bền vững sau 2.19.1 |
| `teammate-idle-handler` | TeammateIdle · chuẩn bị remove trong 2.19.2-beta | Agent Teams teammate idle; không nên coi là hook bền vững sau 2.19.1 |
| `team-context-inject` | not wired | Có ý nghĩa khi workflow/team layer gọi tới |
| `usage-context-awareness` | not wired | Usage/context injection wrapper; không nằm trong template hook thường |

Điểm dễ sót: `isHookEnabled()` chỉ tắt khi `hooks.<name>` là `false`. Key thiếu thường được xem là enabled. Nhưng vài guard còn có công tắc riêng: `privacy-block` vẫn đọc key cũ `privacyBlock=false`, còn `simplify-gate` có `simplify.gate.enabled` và ENV `CK_SIMPLIFY_DISABLED=1`.

### Manual bật/tắt và tự kiểm tra hook

Muốn chỉnh nhanh, sửa `.ck.json` ở scope cần tác động. Project config ưu tiên hơn global khi key được set rõ; key thiếu thì tiếp tục inherit/default. Với các hook đã được wire trong `settings.json`, đặt `false` là tắt, đặt `true` là bật lại sau khi scope cao hơn đã tắt.

```json
{
  "hooks": {
    "scout-block": false,
    "privacy-block": true
  },
  "privacyBlock": true,
  "simplify": {
    "gate": {
      "enabled": true
    }
  }
}
```

| Muốn làm | Chỉnh ở đâu | Lưu ý |
|----------|-------------|-------|
| Tắt một hook đã wire | `.ck.json`: `{"hooks":{"scout-block":false}}` | Hook script vẫn còn, nhưng runtime cho qua |
| Bật lại hook bị tắt ở global | project `.ck.json`: `{"hooks":{"scout-block":true}}` | Key local rõ ràng override global |
| Tắt privacy guard | `.ck.json`: `{"hooks":{"privacy-block":false}}` hoặc `{"privacyBlock":false}` | `privacyBlock=false` là key cũ nhưng vẫn có hiệu lực |
| Bật simplify-gate chặn thật | `.ck.json`: `{"hooks":{"simplify-gate":true},"simplify":{"gate":{"enabled":true}}}` | Thiếu `simplify.gate.enabled=true` thì gate chưa bật chế độ chặn |
| Tắt simplify-gate theo session/scope | `settings.json` env: `CK_SIMPLIFY_DISABLED=1` | Env override mạnh hơn config gate |
| Bật workflow-artifact-gate | Wire `settings.json` + `.ck.json`: `{"hooks":{"workflow-artifact-gate":true}}` | Fresh install chưa wire sẵn, nên chỉ sửa `.ck.json` là chưa đủ |

Muốn biết hook có được trigger không, nhìn lifecycle event chứ không nhìn tên file. Cùng một hook script chỉ chạy khi event/matcher trong `settings.json` khớp với hành động hiện tại.

| Hook | Trigger thủ công | Ghi chú |
|------|------------------|---------|
| `session-init` | Mở, resume, clear hoặc compact session Claude Code | `SessionStart(startup|resume|clear|compact)` |
| `usage-quota-cache-refresh` | Mở session, gửi prompt mới, hoặc cập nhật Task/Todo | Cache usage; không đọc hook flag riêng |
| `simplify-gate` | Gửi prompt có ý định ship/merge/pr/deploy/publish khi diff đủ lớn | Cần `simplify.gate.enabled=true`; default không block |
| `dev-rules-reminder` | Gửi prompt mới | `UserPromptSubmit`; inject rules theo TTL |
| `subagent-init` | Start subagent bằng Task/agent flow | `SubagentStart` |
| `descriptive-name` | Để Claude định tạo file bằng `Write` | `PreToolUse(Write)` |
| `scout-block` | Để Claude đọc `node_modules`, `dist`, hoặc glob quá rộng | `PreToolUse` trên Bash/Glob/Grep/Read/Edit/Write |
| `privacy-block` | Để Claude đọc `.env`, key file, secret path | `PreToolUse`; có thêm `privacyBlock` |
| `plan-format-kanban` | Để Claude Edit/Write/MultiEdit plan file | `PostToolUse`; warn format |
| `session-state` | Cập nhật Task/Todo, kết thúc subagent, hoặc kết thúc turn | `PostToolUse`, `SubagentStop`, `Stop` |
| `cook-after-plan-reminder` | Cho Plan subagent kết thúc | `SubagentStop(Plan)` |
| `workflow-artifact-gate` | Wire vào `UserPromptSubmit` / `PreToolUse(Bash)`, hoặc chạy script với `--stage` | Fresh install chưa tự trigger hook mode |
| `task-completed-handler` | Hoàn tất task trong Agent Teams | `TaskCompleted`; chuẩn bị remove trong `claudekit-engineer@2.19.2-beta` |
| `teammate-idle-handler` | Để teammate trong Agent Teams hết việc và đi idle | `TeammateIdle`; chuẩn bị remove trong `claudekit-engineer@2.19.2-beta` |
| `team-context-inject` | Wire vào `SubagentStart`, rồi start team subagent | Có ý nghĩa khi agent id thuộc team |
| `usage-context-awareness` | Wire vào event mong muốn, hoặc dùng hook cache refresh đang wired sẵn | Wrapper tương thích cũ quanh usage quota cache refresh |

Tắt simplify-gate bằng env trong `settings.json`:

```json
{
  "env": {
    "CK_SIMPLIFY_DISABLED": "1"
  }
}
```


## Section 05: scout-block, chặn đọc thư mục rác

### Vấn đề mà scout-block giải quyết

Agent rất hay làm kiểu này:

- "Để mình đọc `node_modules/react/` xem implementation"
- "Glob `**/*.ts` ở root cho biết codebase có gì"
- "Cat thử `dist/index.js` xem build ra sao"

Mỗi lần như vậy là vài chục nghìn token bị nhét vào context window, kéo theo cost và làm chất lượng các turn sau kém đi. Tệ hơn, kết quả từ `node_modules` ô nhiễm context. Agent bắt đầu dựa vào code thư viện thay vì code của project.

### Cơ chế

`scout-block.cjs` đăng ký dưới PreToolUse, chạy trước mọi Read/Bash/Glob/Grep.

Pipeline:

1. Load `.ckignore` baseline đi kèm CK (`~/.claude/.ckignore`) cộng project-local `.claude/.ckignore` nếu có
2. Parse bằng package `ignore` (gitignore-spec)
3. Lấy path từ `tool_input.file_path`, `tool_input.path`, hoặc bash command qua `path-extractor.cjs`
4. Hai cách phát hiện:
   - Match path: nếu path hit `.ckignore` pattern thì exit 2
   - Pattern quá rộng: nếu Glob dùng `**/*.ts`, `**/*`, `*.*` ở project root thì exit 2 kèm gợi ý thu hẹp pattern

Các thư mục bị chặn mặc định: `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `__pycache__`, `.venv`, `venv`, `vendor`, `target`, `.git`, `coverage`.

### Allowlist quan trọng

Có một ngoại lệ phải biết: **build commands luôn được cho qua**. Những lệnh như `npm build`, `go build`, `cargo build`, `make`, `docker build` vẫn chạy, kể cả khi quá trình build chạm `node_modules` hoặc `dist`. Nếu chặn build thì các flow ship/test của CK dễ tự vấp ngay từ bước build.

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
2. URI decode trước khi match để catch `%2e` obfuscation
3. Nếu hit và chưa có prefix `APPROVED:`, exit 2 kèm JSON marker:

```
@@PRIVACY_PROMPT_START@@
{ "type": "PRIVACY_PROMPT", "question": {...}, "options": [...] }
@@PRIVACY_PROMPT_END@@
```

4. Claude phải parse JSON, gọi `AskUserQuestion`. Nếu user duyệt thì retry với prefix `APPROVED:.env` để bypass.

Flow này được tài liệu hoá trong CLAUDE.md global, không phải convention ngầm. Nó tận dụng `AskUserQuestion` để buộc user approval rõ ràng thay vì để model tự diễn dịch consent.

### Có thêm pattern secret được không

Danh sách pattern đang được hard-code. Nếu repo có file secret riêng (ví dụ `vault-credentials.json`), không có config public nào của hook để thêm pattern. Hai cách xử lý:

1. Đặt file vào path khớp regex sẵn có (ví dụ rename thành `*-credentials.*`)
2. Fork hook hoặc patch `PRIVACY_PATTERNS` array local

Không có config flag kiểu `privacyBlock.extraPatterns` ở thời điểm bài này viết.

### Ngoại lệ Bash, gap rất rõ

`privacy-block` cho Bash tool đi qua, chỉ cảnh báo. Lý do là flow "user duyệt thì dùng bash cat <file>" cần Bash chạy được, mà Bash thường được auto-approve theo policy. Tác dụng phụ: bất kỳ ai đã có quyền chạy Bash đều có thể đọc secret mà không qua approval flow. Đây là gap thứ hai.

### Nếu đã leak rồi

Privacy-block chỉ chặn READ. Khi secret đã vào transcript, file không thể "rút lại". Việc cần làm:

1. Rotate credential ngay (đổi API key, regenerate token)
2. Audit conversation log directory của Claude Code để xác định mức leak
3. Check git history xem secret có bị commit vô tình không, nếu có thì rewrite history

Tốt nhất không tin "privacy-block đã bảo vệ", luôn rotate khi nghi ngờ.


## Section 07: simplify-gate, chặn ship diff quá to

### Vấn đề

Một task nhỏ có thể phình ra thành PR đụng quá nhiều file: sửa validation, thêm cleanup, đổi format, chỉnh vài helper lân cận. Khi agent nói "OK ship", đây là lúc `simplify-gate` nên kiểm diff trước.

### Cơ chế

`simplify-gate.cjs` đăng ký dưới `UserPromptSubmit`, đọc `git diff HEAD`, chỉ xét khi prompt có: `ship`, `merge`, `pr`, `deploy`, `publish`.

Ngưỡng chặn cứng (theo default):

- Tổng diff > 400 LOC, hoặc
- Số file đụng > 8, hoặc
- Một file đơn lẻ > 200 LOC

> **Chú ý:** Fresh install chưa bật chế độ chặn. Hook script có thể được gọi, nhưng gate chưa block gì nếu thiếu `simplify.gate.enabled = true`.

### Cảnh báo quan trọng về default

`hooks["simplify-gate"] = true` chỉ nghĩa script được phép chạy. Muốn script thật sự chặn PR phình quá scope, phải bật thêm `simplify.gate.enabled = true`. Fresh install chưa bật flag này, nên gate chỉ chạy kiểm tra nhẹ và không block.

Để bật thật sự, project config cần ghi rõ:

```json
{
  "simplify": { "gate": { "enabled": true } }
}
```

`.ck.json` hooks map nói `true` (script chạy), nhưng config con của gate mới quyết định có block không. Audit cả hai layer trước khi tin `simplify-gate` đang bảo vệ.

### Cách lệch ngoài ý muốn

`matchedSeverity()` bỏ qua vài cách diễn đạt như `"don't ship"`, `"do not ship"`, `"ship on"`. Mục đích là khi user nói chuyện meta về ship ("don't ship yet, let me review first"), hook không bật. Tác dụng phụ: một câu tự nhiên như `"ship on Friday"` cũng được bỏ qua.

### Tắt khẩn cấp

Muốn tắt gate cho mọi session ở scope đó, đặt `CK_SIMPLIFY_DISABLED=1` trong `settings.json` dưới key `env`.


## Section 08: workflow-artifact-gate, kiểm tra 5 artifact JSON

### Vấn đề

Full pipeline để lại file JSON ghi quyết định sau mỗi phase, như hoá đơn sau mỗi bước. Thiếu artifact thì không biết ai đã kiểm gì, pass vì sao, còn rủi ro nào chưa xử lý.

### Cơ chế

`workflow-artifact-gate.cjs` được thiết kế để gắn vào `UserPromptSubmit` và `PreToolUse(Bash)`, nhưng không nằm trong hook set chạy sẵn sau fresh install. Muốn dùng phải opt-in.

5 file JSON cần có trước ship/push/pr/deploy:

| Artifact | Phase tạo | Nội dung |
|----------|-----------|----------|
| `context-snippets.json` | scout/plan | Snippet code đã đọc |
| `risk-gate.json` | predict | High-risk flag, auto-stop required |
| `verification.json` | fix/cook | 5-point verification checklist pass |
| `review-decision.json` | code-review | Reviewer verdict |
| `adversarial-validation.json` | adversarial | Adversarial pass |

Gate này có hai mức xử lý:

- Ở bước rủi ro như ship, push, PR hoặc deploy, hook có thể dừng flow ngay và trả lý do về cho model (`emitBlock()`).
- Ở bước nhẹ hơn như finalize hoặc commit, hook cho flow đi tiếp nhưng thêm cảnh báo vào context để model tự sửa (`emitSoft()`).

### Vì sao opt-in

`workflow-artifact-gate` là lớp kiểm artifact mạnh nhất, nhưng fresh install chưa tự gọi nó. Muốn dùng, phải wire hook trong `settings.json` và bật config trong `.ck.json`; nếu thiếu bước này, ship/push/PR/deploy không bị gate chặn.


## Section 09: Hard-gate XML trong skill markdown

### Vấn đề

Hook chỉ chặn được tool call. Có những loại lỗi không phải tool call mà là **trình tự**: code trước plan, fix trước scout, ship trước review. Cách CK xử lý là gắn `<HARD-GATE>` XML block vào skill markdown.

### Ví dụ trong ck:cook

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

Ngoài 4 tag XML, ck:fix có thêm một section markdown tên Anti-Rationalization, liệt kê pattern lệch (giả định, suy đoán) gắn với câu trả lời cứng. Section này không phải XML hard-gate, nhưng đóng vai bổ trợ.

### Tại sao gọi là "hard"

Chữ "hard" ở đây dễ gây hiểu nhầm. Nó không phải chặn bằng code. Đây là lời dặn trong prompt, Claude vẫn phải tự làm theo. Khác với hook ở chỗ: nếu model bỏ qua HARD-GATE, không có exit 2 nào chặn. Cách bọc XML và tên "HARD-GATE" tạo signal mạnh hơn rule thường để model khó tự hợp lý hoá việc đi tắt. Nhưng vẫn không phải hook, model hiểu lệch vẫn có thể đi sai.


## Section 10: dev-rules-reminder, đưa rule vào context

### Cơ chế thêm rule vào context

`dev-rules-reminder.cjs` đăng ký `UserPromptSubmit`, đưa rules text vào mỗi prompt. Ở đây có hai lớp cần tách rõ: hook là cơ chế inject context, còn rule trong `CLAUDE.md` là nội dung được inject. TTL 5 phút theo `(sessionId, baseDir)` để tránh đốt token.

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

Danh sách này để đừng hiểu nhầm guard rail.

1. **File-access guard nằm ở hook**. Fresh CK install dựa vào `scout-block` / `privacy-block`, không phải một danh sách `permissions.deny` riêng cho secret/heavy dirs.
2. **Bash được miễn privacy-block**. Chỉ warn, không đi qua approval flow.
3. **workflow-artifact-gate cần opt-in**. Gate mạnh nhất không chạy nếu chưa bật.
4. **simplify-gate mặc định chưa chặn**. Cần bật rõ.
5. **simplify-gate trượt bằng phrasing**. `"ship on Friday"` được bỏ qua.
6. **`.ckignore` có thể negate `node_modules`**. Kiểm tra trực tiếp.
7. **Rules là lời dặn**. Claude có thể lệch.
8. **HARD-GATE XML cũng là lời dặn**. Có "User override".

### Không có rate-limit / quota guard

Agent mất kiểm soát có thể call hàng nghìn Read/Glob/Bash. Hook CK không đếm số tool call, không tự dừng khi gần hết quota. Giới hạn quota/cost nằm ở Claude Code, provider hoặc account billing, không phải ở guard rail này.


## Section 13: Best practices và pitfalls

### Best practices

- Đọc cả `settings.json` + `.ck.json` sau khi cài.
- Bật `workflow-artifact-gate` cho repo ship production.
- Muốn simplify-gate chặn thật: set `gate.enabled = true`.
- Cần `node_modules`: project `.ckignore` override.
- Approval `.env`: đọc kỹ, đừng auto-yes.

### Pitfalls

- Sửa global config nhưng tưởng đang sửa config của repo.
- Tưởng simplify-gate đang chặn, trong khi mặc định chưa bật chế độ chặn.
- Tưởng hook lỗi là tool sẽ bị chặn; thực tế hook fail thì thường cho qua.
- Tưởng rule trong prompt cũng chặn được như code hook.
- Secret đã vào commit rồi mới trông chờ privacy-block cứu lại.

### 6 câu kiểm tra trước khi tin guard rail

- [ ] `settings.json` đang gắn hook nào vào lifecycle nào?
- [ ] `.ck.json` đã disable hook nào? (outer + inner config)
- [ ] Claude Code session hiện tại có đang bỏ qua permission prompt không?
- [ ] Có project `.ckignore` override không? Đặc biệt `node_modules` có bị `!` allowlist không?
- [ ] Rule files trong CLAUDE.md có đầy đủ không?
- [ ] Có hook nào đang crash âm thầm trong session này không (check stderr)?


## Tóm tắt

Khi agent có quyền rộng, đừng kết luận "CK đã cài là an toàn". Trước khi tin guard rail, kiểm tra hai nơi: `settings.json` đang wire hook nào, `.ck.json` đang bật/tắt gì.

Mỗi lớp bảo vệ một kiểu rủi ro: hook chặn tool call, rule nhắc hành vi, hard-gate giữ quy trình, guard skill chỉ chạy khi được gọi. Biết lớp nào đang chạy và lớp nào chỉ là lời dặn giúp audit đúng chỗ, trước khi lỗi lọt vào PR và đi tiếp lên PROD.
