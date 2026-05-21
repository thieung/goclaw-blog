---
title: "Khi nào dùng /ck:plan --deep --tdd"
description: "Khi nào dùng --deep, khi nào thêm --tdd, và khi nào nên đi đường ngắn hơn"
series: "Inside ClaudeKit"
product: "ClaudeKit Engineer"
project: claudekit
status: approved
created: 2026-04-22
updated: 2026-05-21
slug: ck-plan-deep-tdd-when-to-use
tags: [claudekit, planning, deep, tdd, refactor]
---

# Khi nào dùng `/ck:plan --deep --tdd`

*Không phải task nào cũng cần mode nặng. Bài này tách rõ lúc nào cần `--deep`, lúc nào thêm `--tdd`, và lúc nào nên đi đường ngắn hơn.*

Một refactor lớn hiếm khi hỏng ngay ở dòng code đầu tiên. Nó thường hỏng vì lúc plan chưa nhìn đủ scope, rồi đến lúc cook mới phát hiện test, migration hoặc background job bị bỏ sót.

Case xuyên suốt: **tách billing module ra khỏi monolith**.

Billing đang nằm rải rác trong API routes, database models, background jobs, retry logic, invoice status, webhook handler và admin UI. Task nghe đơn giản: "tách billing ra module riêng, giữ behavior cũ". Nhưng khi agent bắt đầu chạy, câu hỏi mới lộ ra:

- File nào thật sự thuộc scope: API, jobs, DB, UI, hay webhook?
- Behavior nào phải giữ nguyên: retry, idempotency, invoice status, payment failure?
- Test hiện tại đang cover được bao nhiêu?
- Phase này có phụ thuộc ngầm vào migration hoặc background job không?
- Nếu code mới build được nhưng lệch edge case thì ai bắt?

Với task nhỏ, `/ck:plan --fast` hoặc `/ck:plan` mặc định thường đủ. Với task phức tạp nhưng chưa tới major refactor, `--hard` thường hợp hơn. Với task lớn, thiếu context ở đầu sẽ tạo chi phí ở cuối: cook phải đoán lại scope, phase file mơ hồ, test viết sau code, regression chỉ lộ khi đã refactor xong.

Đây là lý do `--deep` và `--tdd` đi cùng nhau khá hợp.

> **Ý chính**
>
> `--deep` giúp plan nhìn đủ vùng bị ảnh hưởng: file inventory, test gap, dependency giữa các phase. `--tdd` ép flow ghi lại behavior hiện tại trước khi refactor, rồi dùng chính test đó làm regression gate.

Hai thứ này không phải "mode mạnh hơn" theo nghĩa cứ bật là tốt hơn. Chúng giải quyết hai rủi ro cụ thể: **không biết đủ scope** và **không bảo vệ được behavior cũ**.


## Section 01: Mode vs Flag, hai khái niệm khác nhau

Trước khi đi tiếp, cần tách bạch một điểm dễ nhầm.

`/ck:plan` nhận 2 loại tham số:

| Loại | Ví dụ | Tác dụng |
|------|-------|----------|
| **Mode** | `--fast`, `--hard`, `--deep`, `--parallel`, `--two` | Chọn pipeline. Mỗi lệnh chỉ dùng một mode |
| **Composable flag** | `--tdd`, `--no-tasks` | Phần cộng thêm. Có thể đi cùng bất kỳ mode nào |

Điểm quan trọng:
- `--deep` là **mode**, tức đổi pipeline planning
- `--tdd` là **flag**, tức giữ mode đã chọn nhưng thêm phần tests-first vào phase file và cook flow

Cú pháp command nhìn đơn giản:

```
argument-hint: "[task] [--fast|--hard|--deep|--parallel|--two] [--tdd|--no-tasks]"
```

Dấu `|` giữa các mode nghĩa là chọn một. `--tdd` đứng ở block riêng nên có thể compose.

Vì vậy `--deep --tdd` hợp lệ, còn `--deep --hard` thì không.


## Section 02: `--deep`, khi plan cần bản đồ từng phase

### Vấn đề mà `--deep` giải quyết

Task lớn thường có nhiều vùng code cùng bị ảnh hưởng. Với billing module, scope có thể trải qua:

- API routes: create invoice, retry payment, refund, webhook callback
- Database: invoice table, payment attempt table, status history
- Background jobs: retry scheduler, reconciliation job, webhook replay
- Admin UI: invoice detail, manual retry, refund action
- Shared contracts: frontend API response, webhook payload, event names

Những task này không chỉ cần danh sách bước. Chúng cần bản đồ:

| Câu hỏi | Trong ví dụ billing |
|---------|---------------------|
| File nào create/modify/delete? | Route, service, job, migration, UI action |
| Test nào đang cover behavior cũ? | Retry, idempotency, refund, webhook replay |
| Phase nào phụ thuộc phase nào? | Migration phải đi trước service, service đi trước UI |
| Interface nào cần test protection? | API response, webhook payload, job input |
| Dependency edge nào rủi ro? | Job đọc status cũ trong khi service đã đổi enum |

`--deep` phù hợp khi chi phí plan sai lớn hơn chi phí plan kỹ.

Rule chọn mode có thể tóm gọn:

```
Major refactor, 5+ areas, architectural debt -> use --deep
```

Nếu chỉ đụng ít file, `--fast` hoặc `/ck:plan` mặc định thường đủ. Nếu scope phức tạp nhưng kiến trúc vẫn rõ, `--hard` thường hợp hơn. `--deep` đáng dùng khi một plan sai sẽ kéo theo nhiều giờ sửa lại phase, test và ownership.

### Pipeline của `--deep`

Pipeline của `--deep` có thể tóm gọn thành 8 bước:

1. Chạy **2-3 lượt researcher** cho high-level architecture analysis
2. Đọc docs + chạy `/ck:scout` qua affected areas
3. **Scout từng phase**, điểm khác biệt so với `--hard`: với MỖI phase đã plan, chạy focused scout:
   - Inventory file sẽ create/modify/delete
   - Count existing tests + identify missing coverage
   - List functions/interfaces cần test protection
   - Identify duplicated code hoặc risky dependency edges
4. Planner đưa dữ liệu scout vào từng phase file
5. Red-team review
6. Post-plan validation
7. Tạo task list (trừ khi `--no-tasks`)
8. Output cook command: `/ck:cook {path}/plan.md`

So với `--hard`, thường scout một vòng cho toàn plan, `--deep` đi thêm một lượt cho từng phase. Chi phí cao hơn, nhưng đổi lại phase file cụ thể hơn: file nào đụng, test nào thiếu, dependency nào rủi ro.

### Phase file cần gì thêm khi dùng `--deep`

Với `--deep`, phase file cần thêm:

- **File inventory table**, action (create/modify/delete), rough size, test impact
- **Test scenario matrix**, critical/high/medium paths
- **Dependency map**, phase này link đến phase nào khác
- **Function/interface checklist**, hàm hoặc interface nào cần test bảo vệ

Đây là phần khác biệt chính. Một phase không chỉ nói "refactor billing service". Nó phải nói rõ file nào, test nào, edge nào, và phase này dựa vào phase nào.


## Section 03: `--tdd`, khi sợ refactor phá behavior đang chạy

### Vấn đề mà `--tdd` giải quyết

Flow mặc định của cook khá quen thuộc: đọc plan, implement từng task, type check sau mỗi file, rồi đến bước testing riêng sau đó.

Với greenfield thì ổn. Với refactor code đang chạy, cách đó chưa đủ an toàn.

Trong ví dụ billing, behavior cũ có thể là:

- Retry chỉ chạy tối đa 3 lần, sau đó chuyển invoice sang `failed`
- Webhook cùng `event_id` chỉ được apply một lần
- Refund không được chạy nếu invoice đã `voided`
- Admin UI vẫn phải hiện đúng status history sau khi service tách ra

Happy path có thể vẫn pass. Bug thường nằm ở edge case.

`--tdd` tạo regression gate trước khi đổi code. Ở đây "TDD" không phải viết test cho feature mới, mà là **chụp behavior hiện tại trước khi refactor**.

### Khi nào `--tdd` có giá trị nhất

Không phải mọi phase đều nhận được giá trị như nhau từ `--tdd`.

| Tình huống | Có nên dùng `--tdd`? | Với billing |
|-----------|-------------------------|-------------|
| Greenfield code mới hoàn toàn | Thường không | Chưa có invoice/retry behavior để chụp |
| Refactor module đang có user dùng | Có | Cần giữ retry, idempotency, status transition |
| Đổi payment provider nhưng giữ contract cũ | Có | Dễ lệch API response hoặc webhook behavior |
| Fix 1-2 dòng rõ nguyên nhân | Thường không | Ví dụ sửa typo label trong admin UI |
| Prototype throwaway | Không | Chi phí test gate không hợp lý |

`--tdd` có giá trị nhất ở các module có async pattern, stateful workflow, database transaction, hoặc public API contract. Billing có đủ các nhóm này: background jobs, status transition, transaction boundary, webhook payload, admin actions.

### Ở bước plan

Khi `--tdd` bật, phase file có 4 section quan trọng:

| Phần trong phase file | Vai trò |
|---------|---------|
| **Test trước refactor** | Viết regression coverage trước khi đổi code, để ghi lại behavior hiện tại |
| **Refactor** | Mô tả phần code được đổi và được các test trên bảo vệ |
| **Test bổ sung** | Thêm test cho behavior mới trong phase, nếu có |
| **Gate cuối phase** | Compile + test command cụ thể phải pass sau refactor |

Luồng phase thường được viết theo form:

```
Một phase dùng --tdd thường đọc theo thứ tự:
1. Viết test bảo vệ behavior hiện tại
2. Tách một điểm phụ thuộc nhỏ nếu code cũ khó test
3. Refactor code
4. Chạy lại compile + tests
```

Phần làm code cũ test được thường bị bỏ qua. Có khi code cũ không test trực tiếp được: một function dài tự gọi database bên trong, không inject được dependency, không isolate được output. Khi đó cần tách một điểm phụ thuộc nhỏ trước, vẫn giữ behavior như cũ, nhưng làm cho code test được. Sau đó mới refactor thật.

### Khi cook chạy

Khi `--tdd` active, cook không nhảy thẳng vào refactor. Nó chạy theo thứ tự dễ nhớ hơn:

```
1. Viết test bảo vệ behavior hiện tại
2. Refactor code
3. Chạy lại compile/test gate
```

Hiểu đơn giản: test viết trước là mốc so sánh cho behavior cũ. Sau refactor, nếu mốc này fail thì cook nên dừng lại để sửa phần behavior bị lệch, trước khi đi tiếp.

> **Tham chiếu version**
>
> Bài này đối chiếu với Engineer Kit `engineer@v2.19.1-beta.10` tại thời điểm viết, kiểm tra qua `ck -V`. Note này chỉ để tránh nhầm nếu workflow của `ck:plan` hoặc `ck:cook` thay đổi về sau.


## Section 04: Vì sao `--deep --tdd` hay đi chung

`--deep` và `--tdd` giải quyết hai lớp rủi ro khác nhau.

| Rủi ro | Cần gì | Option |
|--------|--------|--------|
| Không biết đủ scope | Scout từng phase, file inventory, dependency map | `--deep` |
| Refactor làm lệch behavior cũ | Test trước refactor, Regression Gate lúc cook | `--tdd` |

Một refactor lớn thường có cả hai rủi ro. Ví dụ:

```text
Tách billing module ra khỏi monolith.
Giữ API contract hiện tại cho frontend.
Giữ behavior cũ cho retry, idempotency, invoice status.
Đụng database schema, background jobs, API routes, admin UI.
```

Task billing này cần `--deep` vì scope rộng và dependency nhiều. Nó cũng cần `--tdd` vì retry, idempotency, refund và webhook đều là behavior cũ cần giữ.

Nếu chỉ bật `--deep`, plan có thể rất rõ nhưng refactor vẫn thiếu regression gate.

Nếu chỉ bật `--tdd`, test flow có thể đúng nhưng phase file vẫn mơ hồ: test gì, ở đâu, module nào bị ảnh hưởng, dependency nào cần đi trước.

> **Nhớ nhanh**
>
> Task rộng thì dùng `--deep`. Có behavior cũ phải giữ thì thêm `--tdd`. Có cả hai mới bật cả cặp.

Cặp này hợp nhất với nhóm task: **major refactor trên codebase đã có behavior cần giữ**.


## Section 05: Khi nào dùng `/ck:brainstorm` hoặc `/ck:scout` trước

Một lỗi dễ gặp: dùng `--deep --tdd` khi approach còn mơ hồ. Plan mode không tự giải quyết ambiguity. Nó chỉ biến **approach đã chọn** thành các bước cụ thể hơn.

Ví dụ, nếu chưa quyết:

- Tách service thật hay chỉ modularize trong monolith?
- Dùng queue mới hay giữ background job hiện tại?
- Giữ invoice status enum hiện tại hay đổi sang state machine rõ hơn?
- Rewrite admin UI flow hay refactor từng phần?

Trường hợp đó nên dùng `/ck:brainstorm` trước để chốt approach, rồi mới plan.

Một layer nữa là `/ck:scout`. Hãy xem nó như bước gom context, không phải bước ra quyết định. Scout hợp khi chưa chắc code nằm ở đâu, module nào liên quan, test nào đang cover behavior hiện tại.

Flow lúc thiếu bối cảnh:

```bash
/ck:scout "billing retry flow, invoice status, background jobs, admin UI"
/ck:brainstorm "Tách billing module nhưng giữ API contract hiện tại"
/ck:plan --deep --tdd "Refactor billing module theo approach đã chốt..."
```

Nếu bạn đã biết code nằm ở đâu và điểm phải đánh đổi là gì, không cần tách riêng một lượt `/ck:scout`. `/ck:plan --deep` vẫn có bước scout trong pipeline. Nhưng khi brief còn quá chung, scout trước giúp tránh một lỗi âm thầm: agent lập luận nghe hợp lý, nhưng đang bám vào bản đồ project sai.

Quy tắc:

| Tình huống | Bắt đầu từ |
|-----------|------------|
| Chưa rõ project context / chưa biết code nằm đâu | `/ck:scout` -> `/ck:brainstorm` |
| Biết rõ **làm gì** và **làm thế nào** | `/ck:plan` trực tiếp |
| Biết **làm gì**, chưa chắc **làm thế nào** | `/ck:brainstorm` -> `/ck:plan` |
| Chưa biết **có nên làm không** | `/ck:brainstorm` -> quyết -> plan hoặc bỏ |


## Section 06: Decision matrix

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
| **Major refactor trên codebase có behavior cần giữ** | `/ck:plan --deep --tdd` |

Cặp `--deep --tdd` không phải một cơ chế duy nhất, mà là hai việc khác nhau đi cùng nhau. `--deep` cho **bản đồ**. `--tdd` cho **lớp kiểm chứng**.

Chi phí planning tăng, nhưng cook bớt phải đoán scope và có regression gate rõ hơn.


## Section 07: Inside, cơ chế bên trong

Phần này đi sâu hơn vào cách `--deep` và `--tdd` tác động ở lúc plan, lúc cook, và chi phí chạy.

### 7.1 `--deep` tốn hơn vì researcher + scout từng phase

Bảng tổng hợp mode behavior:

| Mode | Researcher | Red Team | Validation | Scout từng phase |
|------|-----------|----------|------------|-----------------|
| `--fast` | 0 | 0 | 0 | No |
| `--hard` | 2 | Yes | Optional | No |
| **`--deep`** | **2-3** | **Yes** | **Yes** | **Yes** |
| `--parallel` | 2 | Yes | Optional | No |
| `--two` | 2+ | Sau select | Sau select | No |

Chi phí của `--deep` chủ yếu đến từ:

- 2-3 researcher cho high-level architecture analysis
- Red-team review
- Validation step
- Lượt đọc lại theo từng phase

Nói đơn giản, mỗi phase được soi lại riêng trước khi chốt plan: phase này đụng file nào, phụ thuộc phase nào, còn thiếu test gì, có edge case nào dễ miss.

Điểm cần tránh hiểu sai: chữ “scout” ở đây nói về **việc phải đọc và kiểm tra lại theo từng phase**, không phải cam kết lúc chạy luôn tạo một agent riêng. Điều quan trọng là `--deep` bắt plan đi qua nhiều lượt kiểm tra nhỏ hơn, thay vì chỉ nhìn scope một lần ở mức tổng quan.

So với `--fast`, `--deep` đắt hơn rõ rệt. Nhưng với một task cỡ vài chục giờ, chi phí plan vẫn hợp lý nếu nó giúp phase rủi ro nhất không đi sai hướng ngay từ đầu.

### 7.2 `--tdd` không tạo agent mới

Điểm dễ hiểu sai: `--tdd` không đổi mode đã chọn. Nó là flag cộng thêm: bạn vẫn chạy `--fast`, `--hard` hoặc `--deep` như bình thường, chỉ thêm cấu trúc tests-first.

Flag chỉ đổi **2 thứ**:

**(a)** Phase file ở lúc plan. Phase thường có overview, yêu cầu, kiến trúc, file liên quan, implementation steps, success criteria, risk assessment.

Khi `--tdd` bật, phase thêm phần test trước refactor, test sau refactor và gate cuối phase.

**(b)** Thứ tự thực thi ở lúc cook. Viết test bảo vệ behavior cũ trước, refactor sau, rồi chạy lại compile/test gate.

Chi phí của `--tdd` thấp hơn `--deep` nhiều. Nó chủ yếu thêm cấu trúc vào phase file và đổi thứ tự thực thi lúc cook.

### 7.3 Regression Gate cần command cụ thể

Cook spec yêu cầu Regression Gate là **compile/test command cụ thể**. Với Go project, ví dụ:

```
Regression Gate: go test ./... && go vet ./...
```

Nếu phase file viết mơ hồ ("run tests to verify"), bước verify yếu đi vì cook không có exact command để bám vào. Flag `--tdd` không tự đảm bảo đoán đúng tool trong mọi repo. Nếu project dùng command riêng, nên ghi rõ ngay trong task description hoặc plan file.

Một cách đơn giản là prepend vào task:

```text
Project dùng go test ./..., frontend dùng npm test, E2E dùng Playwright.
```

Khi task nêu rõ tooling, plan có cơ sở để ghi đúng Regression Gate cho từng phase.


## Section 08: Cách chạy và template tổng quát

Template dưới đây bám theo source skill của `ck:plan` và `ck:cook`: plan nhận task + mode/flag, cook nhận plan path và giữ `--tdd` nếu plan đã bật flag này.

Template tổng quát:

```bash
/ck:plan [mode] [--tdd] "[Việc cần làm].
Phạm vi: [module/file/stack bị đụng].
Giữ nguyên: [API contract, behavior cũ, compatibility].
Đụng: [database, job, route, UI, shared type].
Tooling: [compile/test command cụ thể].
Known bugs / out of scope: [nếu có]."
```

Lưu ý: nếu plan dùng `--tdd`, khi chạy cook cũng thêm `--tdd`:

```bash
/ck:cook /absolute/path/to/plan.md --tdd
```

Áp template vào vài tình huống phổ biến:

**`--deep` cho planning/inventory phase:**

```bash
/ck:plan --deep "Lập plan inventory để chuẩn bị tách billing module ra package riêng.
Scope: API routes, invoice service, payment jobs, admin UI, database schema.
Output cần có: file inventory, dependency map, phase ownership, risk list.
Chưa refactor behavior đang chạy trong round này."
```

**`--hard --tdd` cho refactor code đang chạy/dogfood:**

```bash
/ck:plan --hard --tdd "Refactor invoiceStatusService: tách transition rules
ra file riêng, giữ exact behavior cho retry, failed, refunded, voided."
```

**`--deep --tdd` cho major refactor có behavior cần giữ:**

```bash
/ck:plan --deep --tdd "Tách billing module ra khỏi monolith.
Giữ API contract cho frontend, giữ behavior retry/idempotency/refund/webhook.
Đụng: database schema, payment jobs, API routes, admin UI. Project dùng
go test ./..., frontend dùng npm test."
```

Task description tốt thường có đủ:

- **Phạm vi**, file/module/stack nào
- **Ràng buộc**, không được phá gì, giữ tương thích gì
- **Tooling**, test command, compile command (quan trọng cho `--tdd`)
- **Kết quả mong muốn**, ngắn gọn nhưng cụ thể

Input quá mơ hồ, ví dụ `"refactor billing"`, sẽ cho ra plan mơ hồ. Scout không có anchor cụ thể thì output rất dễ chung chung.


## Section 09: Best practices và pitfalls

### Nên làm trước khi cook

| Nhóm | Practice | Vì sao |
|---|---|---|
| Scope | **Worktree sạch trước khi plan** | Nếu working dir có uncommitted changes từ task khác, scout dễ lẫn code hiện tại với code đang dở. Trước plan lớn: commit hoặc stash. Tốt hơn nữa là tạo worktree riêng qua `/ck:worktree`. |
| Review | **Review phase file trước khi cook** | `--deep --tdd` plan chạy khá lâu, nên đừng cook ngay khi chưa đọc lại `plan.md` và các file phase mà plan tạo ra. |
| Tooling | **Khai báo test command trong task** | Với `--tdd`, repo dùng tool lạ như `bun` thay `npm`, `mise` thay `asdf`, `task` thay `make`? Khai báo luôn. |
| Context | **`/clear` giữa plan và cook** | Plan context trong task lớn thường rất nặng: research output, scout data, red-team feedback. Flow khuyến nghị: plan xong -> `/clear` -> mở lại -> `/ck:cook {absolute-path}/plan.md --tdd`. Cook đọc lại từ file plan, không cần planning context cũ. |

Phase review checklist:

| Câu hỏi | Check | Nội dung |
|---|---|---|
| Q1 | File inventory | Có file nào không muốn agent đụng? |
| Q2 | Test scenario matrix | Có miss race condition hoặc edge case như duplicate webhook? |
| Q3 | Phase order | Có thật độc lập, hay migration phải đi trước job? |
| Q4 | Regression Gate | Đúng tool và đúng test subset chưa? |
| Q5 | Known bugs | Cần fix hay cần preserve behavior cũ? |

```text
Project dùng go test ./..., frontend dùng npm test, E2E dùng Playwright.
```

Không khai báo thì agent sẽ đoán. Đoán sai command làm Regression Gate yếu đi.

### Cần tránh

| Nhóm | Pitfall | Cách hiểu đúng |
|---|---|---|
| Cook flag | **Quên `--tdd` ở `/ck:cook`** | Plan có `--tdd`, cook không có -> cook vẫn đọc được phần test trước refactor, nhưng không enforce thứ tự test trước rồi mới refactor. Test có thể vẫn được viết, chỉ là viết sau code. Nên dùng đúng cook command suggestion trong output plan. |
| Overkill | **`--deep` cho task nhỏ** | Dưới khoảng 5 file thì thường không cần. Dùng `--hard` hoặc `--fast` sẽ gọn hơn. |
| Greenfield | **`--tdd` cho greenfield** | Code mới không có behavior hiện tại để test. Phần “test trước refactor” gần như rỗng, nên agent dễ viết test hình thức thay vì TDD thật. Greenfield dùng `--hard`, để test được viết theo flow thường. |
| Blind spot | **Tin tuyệt đối vào phase file** | `--deep` scout kỹ hơn, nhưng vẫn có thể miss dependency ngầm. Trước khi cook, nên tự hỏi: phase sau có đang ngầm phụ thuộc thứ phase trước chưa tạo ra không? |
| Known bug | **`--tdd` chụp test cho code có bug sẵn** | Billing cũ có bug tiềm ẩn, ví dụ duplicate webhook đôi khi tạo 2 payment attempts. Nếu test trước refactor chụp luôn bug thành “behavior hiện tại”, refactor vô tình fix bug sẽ làm gate fail, rồi agent có thể sửa lại cho đúng bug cũ. Giải pháp: khai báo known bugs trong task, hoặc tách 2 plan: plan 1 fix bug, plan 2 refactor. |
| Mode mix | **Cố ghép `--deep` với `--parallel`** | `--deep` và `--parallel` đều là mode, nên không compose. Nếu cần chạy nhiều agent song song, dùng `--parallel --tdd` và kiểm tra ownership/test scope thật rõ. Nếu chưa chắc ownership và test isolation, bỏ `--parallel`, giữ `--deep --tdd`. |


## Section 10: Tóm lại

`--deep --tdd` không dành cho mọi task.

Nó dành cho nhóm task có hai dấu hiệu:

1. Scope đủ lớn để plan thường dễ thiếu bản đồ
2. Code hiện tại có behavior cần giữ sau refactor

`--deep` làm planning chậm hơn, nhưng đổi lại phase file rõ hơn: file inventory, test gap, dependency map, function/interface checklist.

`--tdd` làm cook chậm hơn, nhưng đổi lại refactor có regression gate: viết test trước, refactor, rồi verify.

Nếu bạn ở vai trò PM/founder/product, chỉ cần biết hai option này tồn tại. Khi team chuẩn bị refactor module lớn như billing, hãy hỏi xem plan đã có scout từng phase và regression gate chưa.

Nếu bạn là dev, hãy thử ở task lớn kế tiếp. Lần đầu có thể thấy tốn thêm thời gian. Nhưng chỉ cần một lần test viết trước bắt được regression ngầm, phần chi phí đó sẽ dễ chấp nhận hơn nhiều.

> **Lưu ý cuối**
>
> `--fast` + `--tdd` -> trade-off yếu.
>
> Về nguyên tắc, `--tdd` đi được với mọi mode. Nhưng nếu đã chọn `--fast` để đi nhanh, thường không đáng thêm một flow test-first nặng hơn.
