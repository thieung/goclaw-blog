---
title: "Claude Code · Cache + Tokenizer + Config — Tech Brief v5"
status: approved
created: 2026-04-21
---

# Claude Code · Cache + Tokenizer + Config — Tech Brief v5

**Cập nhật cuối: 21/04/2026** · Bản `v5` sửa lại các claim đã lỗi thời ở `v4`, đặc biệt là **TTL mặc định, telemetry, và thinking trên Opus 4.7**. Nền tảng dùng cho bản này: Anthropic docs, Claude Code docs/changelog, comment trực tiếp của Boris Cherny trong issue `#45381`, cộng với các phép đo độc lập từ Claude Code Camp và Simon Willison.

---

## Tóm tắt 60 giây

- **Prompt cache không giảm output cost.** Nó chỉ giảm chi phí của phần **input cached** xuống `0.1x` giá input gốc; output vẫn tính đủ giá.
- Với API pricing hiện tại, **cache write 5m = 1.25x**, **cache write 1h = 2x**, **cache read = 0.1x**.
- Tính đến **Claude Code 2.1.108** ngày **14/04/2026**, **subscription users nhận 1h TTL tự động**. Không còn đúng khi nói "TTL mặc định luôn là 5 phút" cho mọi người dùng Claude Code.
- Comment của Anthropic trong issue `#45381` vẫn quan trọng về mặt lịch sử: lợi ích của 1h TTL là **có nhưng nhỏ**, không phải "12x", và trước bản fix thì telemetry có thể làm client rơi về `5m`.
- **Opus 4.7** dùng tokenizer mới; Anthropic nói content có thể tốn khoảng **1.0x-1.35x** token. Với workload giống Claude Code, đo độc lập cho thấy có case vượt mốc này trên từng sample riêng lẻ.
- **Tiếng Việt chưa có số đo chính thức.** Dùng Spanish prose làm proxy là suy luận hợp lý, **không phải fact đã được chứng minh**.
- Trên Claude Code, **Opus 4.7 mặc định `xhigh` effort**. Đây là chỗ dễ đội chi phí hơn nhiều so với chỉ nhìn tokenizer.
- Nếu mục tiêu là **cost predictability**, pre-4.7 vẫn là track ổn hơn. Nếu mục tiêu là **vision + agentic quality**, 4.7 có lý do để dùng, nhưng phải kiểm output và effort level chặt hơn.

---

## 01 — Điều gì thật sự đốt tiền?

Claude không chỉ đọc prompt mới bạn vừa gõ. Nó còn phải đọc lại phần tiền tố còn sống trong context: system prompt, instructions, `CLAUDE.md`, tool definitions, file content đã kéo vào, và lịch sử hội thoại chưa compact.

Vì vậy có 3 line item khác nhau:

1. **Fresh input** — phần mới hoàn toàn, tính giá input bình thường.
2. **Cached input** — phần trùng prefix đã cache, tính `0.1x` giá input.
3. **Output** — phần model trả ra, **không được hưởng cache discount**.

Điểm hay bị hiểu sai: cache có thể giảm mạnh phần context lặp lại, nhưng **không biến một session thành rẻ hơn 90%**. Trong nhiều session code thực tế, output vẫn là một cục cost lớn.

---

## 02 — Prompt Caching: đúng cơ chế, đừng thần thánh hóa

### Pricing hiện tại

| Tier | Multiplier | Ý nghĩa |
|---|---:|---|
| Cache write (5m) | `1.25x` input | Ghi cache với TTL 5 phút |
| Cache hit | `0.1x` input | Đọc lại phần cached prefix |
| Cache write (1h) | `2x` input | Ghi cache với TTL 1 giờ |

### Cache hoạt động trên cái gì?

Anthropic docs mô tả cache chạy trên **prefix** của prompt, theo thứ tự lớn:

1. `tools`
2. `system`
3. `messages`

Muốn hit cache, phần đầu này phải đủ giống lần trước.

### Không chỉ có 2 thứ làm miss cache

Bài `v4` nói "chỉ có hai thứ phá cache". Câu đó quá mạnh. Theo docs hiện tại, cache có thể bị ảnh hưởng bởi nhiều yếu tố hơn:

- TTL hết hạn
- đổi model
- đổi `tools` hoặc tool definitions
- đổi `system` / `CLAUDE.md`
- đổi message prefix
- thay đổi citations setting
- thay đổi web search setting
- thay đổi image input
- một số thay đổi cấu hình suy luận / rendering có tác động tới prompt shape

Nói ngắn hơn: **cache không chỉ phụ thuộc vào thời gian chờ và việc sửa CLAUDE.md**.

---

## 03 — TTL: 5 phút hay 1 giờ?

Đây là chỗ `v4` lệch nhất.

### Điều đúng ở tầng pricing API

Ở tầng platform pricing, Anthropic vẫn tài liệu hóa hai TTL chính:

- `5m`
- `1h`

với multipliers lần lượt là `1.25x` và `2x` cho cache write.

### Điều đã thay đổi trong Claude Code

Tính đến **14/04/2026**, Claude Code changelog ghi rõ:

- thêm `ENABLE_PROMPT_CACHING_1H`
- thêm `FORCE_PROMPT_CACHING_5M`
- và docs env vars hiện tại nói **subscription users receive 1-hour TTL automatically**

Nên nếu bạn đang dùng **Claude Code subscription**, câu "TTL mặc định 5 phút" không còn đúng như một rule tổng quát nữa.

### Vậy comment của Boris Cherny trong issue #45381 còn đúng không?

**Có, nhưng phải đặt đúng mốc thời gian.**

Ngày **13/04/2026**, Boris Cherny giải thích:

- Anthropic đang test heuristic để dùng `1h` cho một số query subscriber
- lợi ích là **small token savings on average**
- tắt telemetry khi đó làm client không gọi experiment gates, nên fallback về `5m`
- lợi ích thực tế **nowhere near 12x**

Một ngày sau, changelog ghi **"Fix going out in the next release"** và Claude Code `2.1.108` đã đưa thêm env vars kiểm soát TTL. Vì vậy:

- nếu bạn viết về **lịch sử bug/regression**, issue `#45381` rất hữu ích
- nếu bạn viết về **hành vi hiện tại của Claude Code ngày 21/04/2026**, phải cập nhật theo docs/changelog mới

### Kết luận thực dụng

- **Claude Code subscription hiện tại:** nghĩ theo mặc định `1h`, nhưng vẫn chấp nhận rằng một số query có thể dùng `5m` tùy heuristic / loại query.
- **API customers:** không nên giả định auto-1h; dùng đúng docs và env vars hiện tại.

---

## 04 — Telemetry: đừng gọi là “thảm họa 12x”

Claim "tắt telemetry làm đắt hơn 12x" là diễn giải sai.

Điểm đúng hơn:

1. Trước bản fix, telemetry có thể ảnh hưởng việc client nhận experiment gates cho TTL.
2. Anthropic engineer nói rất rõ lợi ích trung bình chỉ là **một mức tiết kiệm nhỏ**, không phải cấp số nhân.
3. Sau bản cập nhật **14/04/2026**, Claude Code đã có env vars rõ ràng hơn để ép `1h` hoặc `5m`.

**Khuyến nghị v5:**

- Ưu tiên privacy: tắt telemetry nếu bạn muốn. Đừng tự dọa mình bằng narrative "12x".
- Ưu tiên quota tối đa: kiểm tra docs/env vars hiện tại trước khi kết luận session của bạn đang dùng `1h` hay `5m`.

---

## 05 — Tokenizer 4.7: phần chính thức và phần đo độc lập

### Phần Anthropic xác nhận

Trong docs "What's new in Claude Opus 4.7", Anthropic ghi content **có thể dùng khoảng `1.0x-1.35x` token** so với trước, tùy loại nội dung.

Đây là phạm vi chính thức duy nhất nên bám khi viết summary cấp cao.

### Phần Claude Code Camp đo được

Claude Code Camp đo trên một tập sample kiểu Claude Code và công bố:

- **weighted average ~ `1.325x`** qua 7 sample
- có sample `CLAUDE.md` thực tế lên tới **`1.445x`**

Hai câu này **không mâu thuẫn** nếu viết đúng cách:

- `1.0x-1.35x` là **guidance chính thức của Anthropic**
- `1.325x weighted` là **đo độc lập trên một sample set cụ thể**
- `1.445x` là **outlier của một sample cụ thể**, không phải claim chính thức cho mọi content

### Tiếng Việt thì sao?

Hiện tại **chưa có public measurement chính thức** cho Vietnamese prose trên 4.7.

Nếu muốn ước lượng:

- dùng **Spanish prose ~ `1.35x`** làm proxy là hợp lý
- nhưng phải ghi đúng nhãn là **proxy / inference**

Không nên viết kiểu "tiếng Việt là 1.35x" như một fact đã được chứng minh.

---

## 06 — Vision: 4.7 tốt hơn, nhưng ảnh lớn đắt hơn

Theo docs hiện tại:

- model cũ dùng long edge **1568px**
- Opus 4.7 hỗ trợ long edge **2576px**

Điều này giúp 4.7 nhìn ảnh chi tiết hơn. Nhưng nó cũng mở cửa cho **image token cost tăng** nếu bạn cứ đẩy ảnh full-resolution vào.

Phần đáng tin nhất để diễn giải là:

- **nhỏ hơn 1568px**: chi phí gần model cũ hơn
- **ảnh lớn gần 2576px**: có thể tăng mạnh
- phép đo độc lập của Claude Code Camp + Simon Willison cho thấy nhiều trường hợp **xấp xỉ 3x** với ảnh full-res

Điểm cần viết cẩn thận: đây là **measurement thực nghiệm**, không phải công thức pricing chính thức duy nhất từ Anthropic.

**Khuyến nghị v5:** crop/downsample ảnh trước khi gửi, đặc biệt với screenshot to hoặc PDF render ra ảnh.

---

## 07 — Thinking trên 4.7: chỗ dễ viết sai nhất

### Điều đúng

- Trên Opus 4.7, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` **không có tác dụng**
- Claude Code docs/model config hiện tại cho thấy Opus 4.7 dùng **adaptive reasoning**
- Trên Claude Code, **default effort cho Opus 4.7 là `xhigh`**

### Điều cần sửa từ v4

`v4` nói: **"adaptive thinking always-on, không tắt được"**. Câu này quá tuyệt đối.

Chính xác hơn:

- bạn **không thể** dùng `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` để biến 4.7 về cơ chế fixed-budget cũ
- nhưng Claude Code hiện vẫn có `CLAUDE_CODE_DISABLE_THINKING=1` trong env vars docs

Tức là thứ "không tắt được" là **adaptive reasoning mode theo kiểu cũ**, chứ không phải mọi hình thức thinking đều bất khả vô hiệu hóa.

### `MAX_THINKING_TOKENS` có còn đáng dùng trên 4.7 không?

Phải viết rất cẩn thận:

- với model dùng adaptive reasoning, docs nói budget kiểu này **bị ignore trừ khi adaptive reasoning bị tắt**
- mà trên Opus 4.7, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` lại không có tác dụng

Vì vậy, đừng quảng bá `MAX_THINKING_TOKENS` như một **safety cap đáng tin cậy cho 4.7**. Trên 4.7, đòn bẩy thực tế hơn là:

1. `CLAUDE_CODE_EFFORT_LEVEL`
2. `CLAUDE_CODE_MAX_OUTPUT_TOKENS`
3. thói quen prompt và session hygiene

---

## 08 — Hai track cấu hình, nhưng sửa lại logic

## Track A — Pre-4.7

Phù hợp khi bạn ưu tiên:

- cost predictability
- tokenizer ổn định hơn
- workflow chủ yếu là text/code

### Gợi ý config

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "claude-sonnet-4-6",
  "includeCoAuthoredBy": false,
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING": "1",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "75",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "16000",
    "CLAUDE_CODE_NO_FLICKER": "1",
    "CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS": "1",
    "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1",
    "BASH_MAX_OUTPUT_LENGTH": "20000"
  }
}
```

Ở track này, `MAX_THINKING_TOKENS` + `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` vẫn có logic rõ hơn.

## Track B — Opus 4.7

Phù hợp khi bạn ưu tiên:

- vision tốt hơn
- instruction following tốt hơn ở một số workload
- agentic quality tốt hơn dù cost cao hơn

### Gợi ý config

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "claude-opus-4-7",
  "includeCoAuthoredBy": false,
  "env": {
    "CLAUDE_CODE_EFFORT_LEVEL": "medium",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "75",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "16000",
    "CLAUDE_CODE_NO_FLICKER": "1",
    "CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS": "1",
    "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1",
    "BASH_MAX_OUTPUT_LENGTH": "20000"
  }
}
```

### Đừng nhét vào Track B như thể nó có tác dụng chắc chắn

| Biến | Lý do |
|---|---|
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Không có tác dụng trên Opus 4.7 |
| `MAX_THINKING_TOKENS` | Không nên mô tả là safety cap đáng tin cậy trên 4.7 |

Nếu bạn thật sự cần triệt extended thinking ở một workflow cụ thể, hãy kiểm `CLAUDE_CODE_DISABLE_THINKING` trong docs hiện tại thay vì nhầm nó với adaptive thinking.

---

## 09 — Cost math: dùng như scenario, đừng biến thành định luật

Claude Code Camp có một mô hình session 80 turns và tính ra khoảng:

- **4.6:** `~$6.65`
- **4.7:** `~$7.86-$8.76`

Đây là một **scenario estimate hợp lý**, không phải universal constant.

Nó hữu ích ở chỗ chỉ ra 3 việc:

1. tokenizer 4.7 làm input side phình lên
2. `xhigh` default / higher reasoning có thể đẩy output side lên thêm
3. output vẫn là một mảng cost lớn, nên tối ưu output thường có leverage tốt hơn tối ưu những dòng nhỏ lẻ

Nếu bạn trích con số này, nên gọi đúng tên là **measurement-based scenario**, không phải "chi phí thực tế chung cho mọi session 80 turns".

---

## 10 — Checklist hành vi, bản đã sửa

1. **Một session = một task** khi có thể. Session càng dài, context càng dễ phình.
2. **Đừng giả định TTL chỉ có 5 phút.** Với Claude Code subscription hiện tại, bắt đầu từ giả định `1h`, rồi kiểm lại bằng docs/changelog và hành vi thực tế của bạn.
3. **Giữ `CLAUDE.md` ngắn và ổn định.** Nó vẫn là phần đầu context rất đáng cache.
4. **Crop/downsample ảnh trước khi gửi.** 4.7 phạt ảnh to rõ hơn.
5. **Chốt model trước session.** Đổi model giữa chừng dễ phá continuity và cache usefulness.
6. **Trên 4.7, ưu tiên hạ effort trước khi tối ưu vặt.**
7. **Theo dõi `/context` và `/cost`.** Không đo thì mọi tối ưu đều chỉ là cảm giác.
8. **Nếu workload là tiếng Việt nhiều, tự đo token count trên chính content của bạn.**

---

## 11 — Khi nào nên ở Track A, khi nào nên nhảy sang Track B?

### Ở lại Track A nếu:

- bạn cần cost predictability
- prompt/CLAUDE.md hiện tại đã tune cho 4.6
- workflow nặng text/code, nhẹ vision
- quota/Q5h là constraint chính

### Sang Track B nếu:

- bạn làm nhiều screenshot, UI review, visual debugging
- bạn cần instruction following chặt hơn và chấp nhận cost tăng
- bạn sẵn sàng tune lại effort, output, và image workflow

---

## Sources

- Anthropic Pricing: <https://platform.claude.com/docs/en/about-claude/pricing>
- Anthropic Prompt Caching: <https://platform.claude.com/docs/en/build-with-claude/prompt-caching>
- Anthropic Vision: <https://platform.claude.com/docs/en/build-with-claude/vision>
- Anthropic What's new in Claude Opus 4.7: <https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7>
- Claude Code Environment Variables: <https://code.claude.com/docs/en/env-vars>
- Claude Code Model Config: <https://code.claude.com/docs/en/model-config>
- Claude Code Commands: <https://code.claude.com/docs/en/commands>
- Claude Code Changelog: <https://code.claude.com/docs/en/changelog>
- Anthropic engineer clarification, issue `#45381`: <https://github.com/anthropics/claude-code/issues/45381>
- Claude Code Camp tokenizer measurements: <https://www.claudecodecamp.com/p/i-measured-claude-4-7-s-new-tokenizer-here-s-what-it-costs-you>
- Claude Code Camp image measurements: <https://www.claudecodecamp.com/p/images-cost-3x-more-tokens-in-claude-opus-4-7>
- Simon Willison, token counter comparisons: <https://simonwillison.net/2026/apr/20/claude-token-counts/>

---

## Changelog

- **v5 · 21/04/2026** — Sửa claim TTL mặc định cho Claude Code subscription theo docs/changelog sau `14/04/2026`; sửa diễn giải telemetry; sửa phần thinking/adaptive reasoning trên Opus 4.7; hạ mức khẳng định ở các đoạn chỉ dựa trên measurement bên thứ ba; giữ lại 2-track config nhưng bỏ các khuyến nghị gây hiểu nhầm.
- **v4 · 21/04/2026** — Bản trước đó, có một số claim đúng về pricing và tokenizer nhưng đã lẫn behavior cũ của TTL/telemetry với trạng thái sản phẩm mới hơn.
