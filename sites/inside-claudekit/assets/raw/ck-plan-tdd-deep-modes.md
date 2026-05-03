---
title: "Khám phá sức mạnh của /ck:plan với 2 option mới: --deep và --tdd"
description: "Thông qua case port VividKit Desktop, mình breakdown khi nào nên dùng --deep, khi nào bật --tdd, và khi nào không nên lạm dụng"
series: "Inside ClaudeKit"
project: claudekit
status: approved
created: 2026-04-22
updated: 2026-05-01
slug: ck-plan-tdd-deep-modes
tags: [claudekit, planning, tdd, refactor]
---

# Khám phá sức mạnh của `/ck:plan` với 2 option mới: `--deep` và `--tdd`

*Thông qua case port VividKit Desktop, mình breakdown khi nào nên dùng `--deep`, khi nào bật `--tdd`, và khi nào không nên lạm dụng.*

Mình đang port **VividKit Desktop** từ **Tauri v2 + Rust** sang **Wails v3 + Go**. Backend gần như viết lại; frontend vẫn là React nhưng IPC adapter phải thay. Scope đụng tới SQLite, git, PTY spawn, file watching, NDJSON streaming, process registry.

Context ngắn: VividKit là project mình đã vài lần muốn bỏ. Ban đầu tưởng chỉ cần wrap ClaudeKit thành desktop app rồi vibe một chút; thực tế phức tạp hơn nhiều, trong khi Claude Code Desktop, Codex App và các coding interface khác tiến rất nhanh. Mình vẫn làm vì muốn đưa ClaudeKit tới non-tech users: founder, PM, operator, designer không muốn sống trong CLI/Terminal hay phải học agent orchestration.

Với scope này, prompt kiểu "chuyển backend sang Go" rồi để AI tự chạy rất dễ đi sai. Rust → Go không chỉ là đổi syntax: `lifecycle`, `stream`, `cancellation`, `process cleanup`, `Lifetime`, `ownership`, `trait system`, `tokio runtime`, `portable-pty`... đều phải map lại sang Go idiom như `goroutines`, `channels`, `sync.Map`, `map + RWMutex`, `creack/pty`. Sai một chỗ thì nhẹ là không build, nặng hơn là runtime mới lộ race condition.

Vì vậy mình dùng `/ck:plan --deep --tdd`. Bài này không phải hướng dẫn port VividKit; nó là ghi chú thực chiến về cách khai phá mode mới của `ck-plan`: khi nào dùng `--deep`, khi nào thêm `--tdd`, combo này giúp gì, và lúc nào nên tránh dùng quá tay.


## Section 01: Mode vs Flag — hai khái niệm khác nhau

Trước khi đi tiếp, cần tách bạch một điểm dễ nhầm.

`/ck:plan` nhận 2 loại tham số:

| Loại | Ví dụ | Tác dụng |
|------|-------|----------|
| **Mode** | `--fast`, `--hard`, `--deep`, `--parallel`, `--two` | Chọn pipeline. Mỗi lệnh chỉ dùng một mode |
| **Composable flag** | `--tdd`, `--no-tasks` | Phần cộng thêm. Có thể đi cùng bất kỳ mode nào |

Điểm quan trọng:
- `--deep` là **mode**: đổi pipeline, thêm researcher và per-phase scout
- `--tdd` là **flag**: không đổi mode, nhưng thêm phần tests-first vào phase file và cook flow

Source format trong `ck-plan/SKILL.md`:
```
argument-hint: "[task] [--fast|--hard|--deep|--parallel|--two] [--tdd|--no-tasks]"
```

Dấu `|` giữa các mode nghĩa là chọn một. `--tdd` đứng ở block riêng nên có thể compose.

Nói cách khác: `--deep --tdd` hợp lệ (mình dùng chính combo này). `--deep --hard` thì không.


## Section 02: `--deep` — khi scope là "đại tu" chứ không phải "sửa"

### Port này thực sự khó ở đâu

Ở bản cũ, backend chạy trên Tauri/Rust. Nó có async runtime, SQLite wrapper, git integration, PTY spawn, file watcher, NDJSON streaming, process registry. Frontend gọi backend qua IPC của Tauri.

Ở bản mới, mình chuyển sang Wails/Go. Nghe như đổi framework, nhưng phần khó không nằm ở syntax. Cái khó là giữ behavior trong một runtime khác: process cleanup, stream buffering, SQLite migration, cancellation, event emission, lifecycle của subprocess.

Vì vậy đây không phải task "port code". Nó là task **giữ hành vi cũ trong runtime mới**.

Những vùng bị đụng gồm:
1. App scaffold và build config
2. Models, database, migrations
3. CRUD services cho các domain chính
4. Process manager và streaming
5. Git, filesystem, worktree
6. Frontend IPC adapter
7. Frontend stores, hooks, pages
8. Integration test

Khoảng 8-9 vùng code lớn, trong đó có vài vùng không thể port theo kiểu search-replace. Go concurrency khác Rust khá nhiều. PTY + streaming cũng là nhóm dễ có lỗi chạy được một lúc mới lộ.

`/ck:plan --hard` vẫn có thể dùng. Mình chọn `--deep` vì cần **bản đồ từng phase** trước khi code. Ví dụ: Phase 4 về streaming nên dùng `sync.Map` hay `map + RWMutex` cho process registry? Câu hỏi kiểu này không chỉ là implementation detail; nó ảnh hưởng cách cleanup process, cách emit event, và cách tránh race. `--deep` ép plan phải scout sâu đến mức đó.

### `--deep` khác `--hard` ở đâu

Source `workflow-modes.md`:
```
Major refactor, 5+ areas, architectural debt → deep → Need per-phase scouting
```

Trong lần port này, cả ba điều kiện đều xuất hiện:

| Điều kiện | Trong case này |
|-----------|---------|
| Touch 5+ vùng code | 8-9 vùng code, nhiều sub-module mỗi vùng |
| Có quyết định kiến trúc mới | Rust patterns → Go idioms |
| Sợ ảnh hưởng code đang chạy | App đang phát triển, schema/SQLite data dev vẫn cần giữ backward compat khi migrate |

Nếu chỉ đụng ít file, hoặc kiến trúc đã rõ, `--hard` thường đủ. `--deep` tốn token hơn nhiều, nên mình chỉ dùng khi plan sai sẽ kéo theo sửa sai lớn.

### Pipeline của `--deep`

8 bước (`workflow-modes.md`):

1. Spawn **2-3 researcher agents** cho high-level architecture analysis
2. Đọc docs + chạy `/ck:scout` qua affected areas
3. **Per-phase scout** — điểm khác biệt so với `--hard`: với MỖI phase đã plan, chạy focused scout:
   - Inventory file sẽ create/modify/delete
   - Count existing tests + identify missing coverage
   - List functions/interfaces cần test protection
   - Identify duplicated code hoặc risky dependency edges
4. Planner embed scout data vào từng phase file
5. Red-team review
6. Post-plan validation
7. Hydrate tasks (trừ khi `--no-tasks`)
8. Output cook command: `/ck:cook {path}/plan.md`

So với `--hard`, thường scout một vòng cho toàn plan, `--deep` đi thêm một lượt cho từng phase. Tốn hơn, nhưng đổi lại phase file cụ thể hơn: file nào đụng, test nào thiếu, dependency nào đáng chú ý.

### Kết quả với project mình

Lệnh đã gõ (chạy trên plan port đã có sẵn để refine):
```
/ck:plan --deep --tdd path/to/port-plan.md
```

Output phase file quan trọng nhất — **Phase 4 (Process & Streaming)** — tự document 2 spawn path rõ ràng:

> - **Path A (PTY):** Rust `portable-pty` → xterm.js. Events: `ccs_run_event`
> - **Path B (stdio pipes):** `tokio::process::Command` → NDJSON. Events: `stream:chunk`
>
> Go equivalents:
> - **Path A:** `creack/pty` → same xterm.js. Events: `app.EmitEvent("ccs_run_event", ...)`
> - **Path B:** `os/exec.CommandContext` + StdoutPipe/StdinPipe → same NDJSON parsing
> - Process registry: Rust `HashMap<String, Child>` → Go `sync.Map` or map with `sync.RWMutex`

Đoạn này không phải mình tự viết tay. Scout đọc Rust source, map pattern sang Go idiom, rồi planner đưa thẳng vào phase file. Khi cook chạy Phase 4, nó không phải đoán lại từ đầu "Rust dùng HashMap thì Go nên dùng gì".

Plan cũng chia ownership theo domain thay vì chỉ nói chung chung "port backend":

| Phase | Ownership |
|-------|-----------|
| 3 | CRUD services và domain APIs |
| 4 | Process manager, streaming, session watcher |
| 5 | Git, filesystem, worktree |

Dependency graph cũng được plan tự vẽ — Phase 1 → Phase 2 → (3, 4, 5 parallel group A) → Phase 6 → (7, 8 parallel group B) → Phase 9.

Điểm đáng nói: `--deep` không làm code nhanh hơn theo nghĩa từng dòng code sinh ra nhanh hơn. Nó giảm số lần cook phải dừng lại để đoán scope. Với một port đa-stack như Rust → Go, phần tiết kiệm nằm ở chỗ ít đi sai nhánh.

### Phase file yêu cầu gì thêm ở `--deep`

Source `plan-organization.md`:

- **File inventory table** — action (create/modify/delete), rough size, test impact
- **Test scenario matrix** — critical/high/medium paths
- **Dependency map** — phase này link đến phase nào khác

Và source `workflow-modes.md` Deep Phase Requirements bổ sung:
- **Function/interface checklist** — hàm nào cần test bảo vệ


## Section 03: `--tdd` — khi sợ refactor phá hành vi đang chạy

### Vấn đề mà flag này giải quyết

Flow mặc định của cook khá quen thuộc: đọc plan, implement từng task, type check sau mỗi file, rồi đến bước testing riêng sau đó.

Với greenfield thì ổn. Với một lần port, mình không muốn như vậy. Có nhiều behavior đang tồn tại trong Rust code và bản Go phải giữ lại:

- Process cleanup order: Rust `Drop` trait tự động; Go phải explicit qua goroutine + context cancellation
- Database connection pool: Rust `rusqlite` single-threaded + mutex; Go `database/sql` có pool built-in
- NDJSON line buffering: Rust tokio `Lines`; Go `bufio.Scanner` có max token size khác

Nếu bản Go vô tình đổi behavior, có thể không lỗi ngay ở happy path. Nó thường lộ ở edge case: process bị cancel giữa chừng, NDJSON line dài, hoặc DB đang có connection cũ. `--tdd` giúp bắt các drift kiểu đó sớm hơn.

### Mình dùng `--tdd` lúc nào

Không phải mọi phase của port đều cần `--tdd`.

- **Phase 1 (scaffold)**, **Phase 2 (models/DB)**: greenfield Go code, không có behavior cũ để bảo vệ → `--hard` đủ
- **Phase 3 (CRUD services)**, **Phase 4 (streaming)**, **Phase 5 (git/fs)**: có tương đương Rust đang work → `--tdd` giúp document behavior hiện tại (bằng integration test chạy Rust version, capture output, rồi assert Go version output giống) → giảm drift

Mình dùng `--tdd` nhiều nhất ở các module có async pattern phức tạp, vì đó là nơi Go idiom khác Rust rõ nhất và dễ port lệch nhất.

Một use case khác mình áp thẳng trong project này: **refactor brainstorm-ui sau khi đã có bản Wails nội bộ để dogfood**. Plan: `plans/260414-1247-brainstorm-ui-redesign/`. Lệnh cook mình đã gõ:
```
/ck:cook plans/260414-1247-brainstorm-ui-redesign/ --tdd
```

Component đã được mình dogfood và review trong app dev. Refactor phần đó mà không có regression gate thì hơi liều.

### Cơ chế ở plan-time

Source `plan-organization.md` quy định phase file khi `--tdd` bật có 4 section bổ sung:

| Section | Vai trò |
|---------|---------|
| **Tests Before** | Regression coverage viết **trước** khi refactor. Document hành vi hiện tại |
| **Refactor** | Mô tả code changes được các test trên bảo vệ |
| **Tests After** | Test cho hành vi mới thêm trong phase (nếu có) |
| **Regression Gate** | Compile + test command cụ thể phải pass sau refactor |

Source `workflow-modes.md` format cấu trúc phase khi `--tdd` bật:

```
Phase N: [Topic]
├── Step A: Write tests for current behavior
├── Step B: Add shared infrastructure or seams
├── Step C: Refactor existing code
└── Step D: Verify compile + tests
```

Step B là chỗ dễ bị xem nhẹ. Có khi code cũ không test trực tiếp được: một function dài tự gọi database bên trong, không inject được dependency, không isolate được output. Khi đó phải thêm một "seam" nhỏ trước, giữ behavior như cũ nhưng làm cho code test được. Sau đó mới refactor thật.

### Cơ chế ở cook-time

Khi `--tdd` active, Step 3 (Implementation) của cook tách thành 3 sub-step (`cook/references/workflow-steps.md`):

```
Step 3.T: Write tests for CURRENT behavior  (regression safety net)
Step 3.I: Implement changes                 (refactor, new code)
Step 3.V: Verify all tests from 3.T still pass + compile gates
```

Cook spec viết rõ: *"Tests from Step 3.T document the current behavior. If any fail after Step 3.I, the refactor broke something and must be fixed before the workflow proceeds."*

Đây là regression gate thật, không chỉ là section trang trí trong plan. Nếu 3.V fail, cook phải dừng ở đó thay vì đi tiếp sang testing hoặc review.

### Điểm dễ quên: `--tdd` phải có ở cả 2 lệnh

Source `workflow-modes.md`:
> *"If planning ran with `--tdd`, append `--tdd` to the reminder above so cook keeps the tests-first execution path."*

Nếu plan với `--tdd` nhưng cook không có `--tdd`, cook đọc phase file có section Tests Before nhưng **không enforce** thứ tự 3.T/3.I/3.V. Kết quả: test vẫn được viết nhưng chạy sau code. Mất luôn regression safety.

Mình đã dính lỗi này vài lần: plan có `--tdd`, nhưng lúc cook lại gõ nhanh `/ck:cook plan.md` và quên flag. Đến khi thấy cook không đi qua sub-step 3.V mới nhận ra. Cách đơn giản nhất là copy đúng lệnh cook mà plan in ra cuối output.

### Khi nào **không** dùng

- **Greenfield** — code mới hoàn toàn, không có hành vi hiện tại để test. Step Tests Before thành no-op → agent dễ viết test cho có thay vì TDD thật
- **Prototype / throwaway** — không đáng trade-off plan time
- **Fix 1-2 dòng** — overkill


## Section 04: Một lưu ý — khi nào dùng `/ck:brainstorm` trước

Một lỗi dễ gặp: dùng `--deep --tdd` khi approach còn mơ hồ. Plan mode không tự giải quyết ambiguity. Nó chỉ biến **approach đã chọn** thành các bước cụ thể hơn.

Trong case port của mình, trước khi `/ck:plan` mình đã biết:
- Target stack là Wails v3 + Go (không còn đắn đo giữa Wails / Fyne / Slint)
- Frontend giữ React (không rewrite sang Svelte dù có cám dỗ)
- Git dùng `os/exec` gọi git CLI (không dùng `go-git`)

Nếu lúc đó mình vẫn chưa quyết git library, `/ck:plan --deep` sẽ dễ bị kéo sang hai hướng: `go-git` hay git CLI. Plan sẽ dài hơn, nhưng chưa chắc tốt hơn. Trường hợp đó nên dùng `/ck:brainstorm` trước để chốt approach, rồi mới plan.

Một layer nữa là `/ck:scout`. Mình xem nó như bước gom context, không phải bước ra quyết định. Scout hợp khi chính mình cũng chưa chắc code nằm ở đâu, module nào liên quan, test nào đang cover behavior hiện tại. Nó giúp AI có bản đồ project trước khi brainstorm.

Flow lúc thiếu bối cảnh sẽ là:

```bash
/ck:scout "brainstorm-ui workflow, streaming state, report preview, Wails bindings"
/ck:brainstorm "Refactor brainstorm-ui để giảm coupling nhưng giữ workflow hiện tại"
/ck:plan --deep --tdd plans/...
```

Nếu đã biết rõ vùng code và trade-off chính, có thể bỏ `/ck:scout` riêng. `/ck:plan --deep` vẫn sẽ scout trong pipeline. Nhưng nếu brainstorm bắt đầu từ mô tả quá chung, scout trước giúp tránh một kiểu lỗi khá âm thầm: AI debate rất hay, nhưng debate trên bản đồ project sai.

Quy tắc:

| Tình huống | Bắt đầu từ |
|-----------|------------|
| Chưa rõ project context / chưa biết code nằm đâu | `/ck:scout` → `/ck:brainstorm` |
| Biết rõ **làm gì** và **làm thế nào** | `/ck:plan` trực tiếp |
| Biết **làm gì**, chưa chắc **làm thế nào** | `/ck:brainstorm` → `/ck:plan` |
| Chưa biết **có nên làm không** | `/ck:brainstorm` → quyết → plan hoặc bỏ |

`--deep` và `--tdd` làm approach đã chọn trở nên chi tiết hơn. Nếu chọn sai hướng từ đầu, scout kỹ hơn chỉ làm sai hướng đó trông có vẻ thuyết phục hơn.


## Section 05: Decision matrix

| Tình huống | Lệnh |
|-----------|------|
| Chưa rõ project context | `/ck:scout` trước, rồi brainstorm/plan |
| Chưa chắc approach | `/ck:brainstorm` trước |
| Fix nhỏ 1-2 file | `/ck:plan --fast` |
| Feature mới trung bình | `/ck:plan` (auto) |
| Feature phức tạp, domain lạ | `/ck:plan --hard` |
| 3+ module độc lập, song song | `/ck:plan --parallel` |
| Phân vân 2 approach cụ thể | `/ck:plan --two` |
| **Refactor 5+ vùng, có nợ kiến trúc** | `/ck:plan --deep` |
| **Refactor code đang chạy/dogfood, sợ regression** | Any mode + `--tdd` |
| **Major refactor / port trên codebase có behavior cần giữ** | `/ck:plan --deep --tdd` |

Combo `--deep --tdd` không phải một chiêu duy nhất, mà là hai việc khác nhau đi cùng nhau. `--deep` cho **bản đồ**: per-phase scout, file inventory, dependency map. `--tdd` cho **safety net**: test hành vi cũ trước khi refactor.

Với lần port Rust → Go này, mình thấy combo đó đáng thời gian bỏ ra. Plan lâu hơn, nhưng vẫn rẻ hơn nhiều so với việc port xong mới đi tìm race condition.


## Section 06: Inside — cơ chế bên trong

Nếu chỉ cần dùng command, có thể nhảy qua Section 07.

### 6.1 `--deep` spawn nhiều sub-agent hơn

Bảng tổng hợp sub-agent per mode (đọc từ `workflow-modes.md`):

| Mode | Researcher | Red Team | Validation | Per-phase scout |
|------|-----------|----------|------------|-----------------|
| `--fast` | 0 | 0 | 0 | 0 |
| `--hard` | 2 | Yes | Optional | 0 |
| **`--deep`** | **2-3** | **Yes** | **Yes** | **1 per phase** |
| `--parallel` | 2 | Yes | Optional | 0 |
| `--two` | 2+ | Sau select | Sau select | 0 |

Ước lượng với project port của mình (9 phase):
- 3 researcher (high-level architecture: Wails 3, Go desktop patterns, source repomix)
- Red-team reviewer (4 vì phase count lớn)
- 1 validation agent
- 9 per-phase scout

Tổng khoảng **17 sub-agent spawn** cho một lệnh plan. Đây là ước lượng từ mô tả pipeline; source không nói rõ per-phase scout luôn là agent riêng hay có thể là tool call trong planner context.

So với `--fast`, `--deep` đắt hơn rõ rệt. Nhưng với một task cỡ vài chục giờ, chi phí plan vẫn nhỏ hơn chi phí sửa lại nếu Phase 4 đi sai.

### 6.2 `--tdd` không tạo sub-agent — chỉ là template injection

Điểm dễ hiểu sai: `--tdd` không spawn agent mới và cũng không đổi mode detection. Trong `cook/references/intent-detection.md` có comment:

```
# "--tdd" is composable and does not change mode selection
```

Flag chỉ đổi **2 thứ**:

**(a)** Template phase file ở plan-time. Phase thường có: Overview · Requirements · Architecture · Related Files · Implementation Steps · Success Criteria · Risk Assessment.

Khi `--tdd` bật, thêm 4 section: Tests Before · Refactor · Tests After · Regression Gate (`plan-organization.md`).

**(b)** Step 3 của cook ở cook-time. Từ monolithic "Implementation" tách thành 3.T → 3.I → 3.V (`cook/references/workflow-steps.md`).

Chi phí của `--tdd` thấp hơn `--deep` nhiều. Nó chủ yếu thêm cấu trúc vào phase file và đổi thứ tự thực thi ở cook Step 3.

### 6.3 Regression Gate phụ thuộc command cụ thể

Cook spec yêu cầu Regression Gate là **compile/test command cụ thể**. Với Go project, ví dụ:

```
Regression Gate: go test ./... && go vet ./...
```

Nếu phase file viết mơ hồ ("run tests to verify"), cook không biết exact command → sub-step 3.V không chạy được → TDD discipline rỗng. Flag `--tdd` không tự đoán đúng tool trong mọi repo. Nếu project dùng command riêng, nên ghi rõ ngay trong task description hoặc plan file.

Mình thường prepend vào task: `"Project dùng go test ./... + frontend dùng npm test"`. AI sẽ populate đúng vào Regression Gate của từng phase.

### 6.4 Tóm lại

- **`--deep`**: tốn hơn, vì thêm researcher và per-phase scout. Đổi lại phase file ít mơ hồ hơn.
- **`--tdd`**: nhẹ hơn, vì chủ yếu đổi template và Step 3 của cook. Điều kiện quan trọng là Regression Gate phải có command cụ thể.
- Hai thứ này không overlap, nên dùng chung được.


## Section 07: Cách chạy và vài mẫu prompt

Lệnh mình đã dùng cho port (refine plan có sẵn):
```
/ck:plan --deep --tdd plans/260412-0239-port-vividkit-wails3/plan.md
```

Và cho các phase cook về sau:
```
/ck:cook plans/260412-0239-port-vividkit-wails3/ --tdd
```

Một vài prompt khác theo cùng pattern:

**`--deep` cho major refactor:**
```
/ck:plan --deep "Tách auth logic từ Django monolith ra service riêng, expose
qua gRPC, giữ backward compat cho internal clients đang gọi từ 3 team khác."
```

**`--hard --tdd` cho refactor code đang chạy/dogfood:**
```
/ck:plan --hard --tdd "Refactor userRepository: split getUser() thành
find/fetch/lookup, giữ exact behavior cho all callers hiện tại."
```

**Combo `--deep --tdd` cho major refactor có behavior cần giữ (như port của mình):**
```
/ck:plan --deep --tdd "Port desktop app từ Tauri v2 + Rust sang Wails v3 + Go,
giữ React frontend, rewrite IPC adapter. Đụng: SQLite layer, git CLI calls,
PTY spawning, NDJSON streaming, process registry. Project dùng go test ./...
và frontend dùng npm test."
```

Task description tốt thường có đủ:
- **Phạm vi** — file/module/stack nào
- **Ràng buộc** — không được phá gì, giữ tương thích gì
- **Tooling** — test command, compile command (quan trọng cho `--tdd`)
- **Kết quả mong muốn** — ngắn gọn nhưng cụ thể

Input quá mơ hồ, ví dụ `"port sang Go"`, sẽ cho ra plan mơ hồ. Scout không có anchor cụ thể thì output rất dễ chung chung.


## Section 08: Best practices mình rút ra

### 1. Worktree sạch trước khi plan

Nếu working dir có uncommitted changes từ task khác, scout lẫn lộn code hiện tại với code đang dở. Trước plan lớn: commit hoặc stash. Tốt hơn: tạo worktree riêng qua `/ck:worktree`.

Mình port Tauri → Wails trong một workspace tách riêng. Source cũ vẫn để nguyên để scout đọc và đối chiếu behavior, còn phần ghi file chỉ nằm ở target mới. Cách này giúp plan có đủ context mà không làm bẩn code đang chạy.

### 2. Review phase file trước khi cook

`--deep --tdd` plan chạy khá lâu. Đừng phí công đó bằng cách cook ngay mà không đọc lại.

Đọc `plan.md` và `phase-XX-*.md` với 5 câu hỏi 30-giây:

1. **File inventory** có file nào không muốn AI đụng? (production config, frozen migration, shared schema)
2. **Test scenario matrix** có miss race condition hoặc business-critical edge case? (với port, đặc biệt quan tâm cancellation + goroutine leak)
3. **Phase order** có thật độc lập? Phase N có ngầm phụ thuộc N-1?
4. **Regression Gate command** đúng tool + đúng test subset?
5. **Known bugs** cần fix hay cần preserve? (xem Pitfall 5)

Có thể sửa thẳng các section như requirements, tests before, risk assessment. Cook đọc plan từ text, nên chỉnh ở đó là có tác dụng.

Không sửa frontmatter hay phase status (`pending`/`in-progress`/`completed`) — phần đó do `ck` CLI quản. Đổi status dùng `ck plan check/uncheck <phase-id>`.

### 3. Với `--tdd`, khai báo test command trong task

Repo dùng tool lạ (`bun` thay `npm`, `mise` thay `asdf`, `task` thay `make`)? Khai báo luôn:

```
"Project dùng go test ./..., frontend dùng npm test, E2E dùng Playwright"
```

Không khai báo thì AI sẽ đoán. Đoán sai command là Regression Gate hở.

### 4. `/clear` giữa plan và cook

Plan context trong task lớn thường rất nặng: research output, scout data, red-team feedback. Giữ nguyên context đó khi cook dễ làm agent lẫn giữa note cũ và code đang sửa.

Flow mình theo: plan xong → `/clear` → mở lại → `/ck:cook {absolute-path}/plan.md --tdd`. Cook đọc plan từ đĩa — không cần planning context cũ.

### 5. Task description đủ phạm vi

Như Section 07: phạm vi, ràng buộc, tooling, kết quả. Nếu mô tả gọn trong một câu quá chung chung, thường chưa đủ cho `--deep`.


## Section 09: Pitfalls

Một vài bẫy mình đã gặp hoặc thấy rất dễ gặp.

**P1 — Quên `--tdd` ở `/ck:cook`.** Plan có `--tdd`, cook không có → cook vẫn đọc được section Tests Before, nhưng không enforce thứ tự 3.T/3.I/3.V. Test có thể vẫn được viết, chỉ là viết sau code. Copy đúng cook command mà plan in ra cuối output.

**P2 — `--deep` cho task nhỏ.** Dưới khoảng 5 file thì thường không đáng. Dùng `--hard` hoặc `--fast` sẽ gọn hơn.

**P3 — `--tdd` cho greenfield.** Code mới không có hành vi hiện tại để test. Step Tests Before thành no-op → agent dễ viết test cho có thay vì TDD thật. Greenfield dùng `--hard`, để test được viết ở Step 4 như bình thường.

Với port của mình, Phase 1 (scaffold) và Phase 2 (models/DB) là greenfield Go → mình **không** dùng `--tdd` cho hai phase đó. Chỉ áp từ Phase 3 trở đi nơi có tương đương Rust đang work.

**P4 — Tin 100% phase file.** `--deep` scout kỹ hơn, nhưng vẫn có thể miss dependency ngầm. Trước khi cook, nên tự hỏi: *"nếu chạy phase N độc lập, nó có thiếu gì từ phase N-1 không?"*

Với port của mình, dependency graph rất rõ (Phase 1 → 2 → parallel group A → 6 → parallel group B → 9). Nhưng nếu plan smaller-scale, dependency có thể ngầm.

**P5 — `--tdd` chụp test cho code có bug sẵn.** Code cũ có bug tiềm ẩn (ví dụ Rust version có memory leak trong PTY cleanup). `--tdd` → Step A chụp luôn bug thành "hành vi hiện tại". Refactor Go vô tình fix bug → Step D fail → AI "sửa lại" cho đúng bug cũ. Giải pháp: khai báo known bugs trong task (`"KHÔNG preserve memory leak trong PTY cleanup của Rust version"`), hoặc tách 2 plan (plan 1 fix bug, plan 2 port).

**P6 — `--deep --tdd --parallel` không ownership rõ.** `--parallel` chạy nhiều agent song song. Nếu thêm `--tdd`, mỗi agent cần test scope rõ. Test dùng chung DB hoặc fixture rất dễ đạp nhau. Chưa chắc ownership và test isolation thì bỏ `--parallel`, giữ `--deep --tdd`.

Port của mình có parallel group (Phase 3, 4, 5 song song) nhưng file ownership phân chia exclusive → không xung đột.


## Section 10: Tóm lại

Port Tauri/Rust → Wails/Go là một trong những task lớn nhất mình làm với ClaudeKit đến giờ. Không có `--deep`, plan rất dễ bỏ qua những quyết định kiểu "Rust `HashMap<String, Child>` nên map sang `sync.Map` hay `map + RWMutex`". Không có `--tdd` cho Phase 3-5, bản Go có thể chạy được nhưng lệch behavior ở edge case.

Với project như vậy, `--deep --tdd` không làm mọi thứ tự nhiên an toàn. Nhưng nó buộc mình viết rõ scope, test gate và dependency trước khi sửa code.

Cả hai đều làm planning chậm hơn. Đổi lại, implementation ít bất ngờ hơn. Với code đã có behavior cần giữ hoặc port đa-stack, mình thường chọn ít bất ngờ.

Nếu bạn ở vai trò PM/founder/product, chỉ cần biết hai option này tồn tại. Khi team chuẩn bị refactor module lớn hoặc port sang stack khác, hãy hỏi xem plan đã có per-phase scout và regression gate chưa.

Nếu bạn là dev, hãy thử ở task lớn kế tiếp. Lần đầu có thể thấy hơi chậm. Nhưng chỉ cần một lần Tests Before bắt được regression ngầm, bạn sẽ biết vì sao nó đáng giữ trong workflow.

### Ghi chú kỹ thuật

- `--deep` (mode) và `--tdd` (composable flag) thêm trong commit `feat(skills): add deep and tdd plan-cook workflows` (hash `3e252e20`), xuất hiện từ ClaudeKit `v2.16.0-beta.8`
- Source tham khảo: `ck-plan/SKILL.md` — argument hint
- `ck-plan/references/workflow-modes.md` — Deep pipeline + TDD phase format
- `ck-plan/references/plan-organization.md` — phase file requirements
- `cook/references/workflow-steps.md` — Step 3.T/3.I/3.V split
- `cook/references/intent-detection.md` — "composable, does not change mode"
- SKILL.md liệt kê 3 ví dụ combination (`--hard --tdd`, `--deep --tdd`, `--parallel --tdd`). Về nguyên tắc `--tdd` combine được với mọi mode kể cả `--fast`, nhưng trade-off với `--fast` không hợp lý
