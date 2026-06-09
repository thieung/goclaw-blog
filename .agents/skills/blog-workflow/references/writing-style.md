# Phong cách viết của Thiệu Nguyễn (thieunv)

Phân tích từ: 3 bài Facebook, 3 bài Substack, 2 bài GoClaw Blog, và session revision `ck-plan-tdd-deep-modes` (Inside ClaudeKit — 4 vòng edits).

*Last updated: 2026-04-22 — bổ sung Section 10 (Inside ClaudeKit editorial patterns từ session revision)*

---

## 1. Phong cách viết cốt lõi

- Giọng văn conversational, authentic, như đang kể chuyện cho bạn bè nghe
- Không dùng giọng marketing, không "đao to búa lớn", không giáo điều
- Chia sẻ góc nhìn thực tế, kèm learning journey và cả mistakes
- Sẵn sàng kể sai lầm, thất bại của bản thân - authenticity > hình tượng hoàn hảo
- Dùng analogies và ví dụ thực tế thay vì lý thuyết suông
- Technical depth nhưng accessible, không gatekeep kiến thức
- Viết như developer chia sẻ với bạn bè. Khi hướng đến non-tech, giải thích thuật ngữ bằng ngôn ngữ đời thường, dùng analogy gần gũi, không assume người đọc biết code
- Giữ nguyên technical terms tiếng Anh khi cộng đồng đã quen (CLI, API, agent, hook, context engineering...), chỉ dịch khi cần

---

## 2. Hai giọng văn theo nền tảng

### Facebook — Casual, conversational
- Xưng "mình", "ae" (anh em)
- Emoji có chọn lọc (😱💸🔓🤣💥)
- Ngắn gọn, hook mạnh, CTA cuối ("Link ở comment 👇")
- Tone: bạn bè kể chuyện hay
- Ví dụ: "... và thế là mình có 1 'cheap' 😆"

### Substack — Professional-analytical
- Xưng "bạn", "mình" (formal hơn)
- Gần như không emoji
- Dài, chi tiết, có code blocks và architecture diagrams
- Tone: practitioner chia sẻ deep knowledge
- Ví dụ: "Bottleneck không còn là tốc độ execute nữa, mà là chất lượng của instruction bạn đưa ra"

### GoClaw Blog — Technical documentation meets visual storytelling
- Không xưng hô cá nhân - impersonal, factual
- Structured sections đánh số (01, 02, 03...)
- Tables cho mọi comparison
- Before/After pattern
- Tone: product changelog nhưng dễ hiểu
- Ngắn gọn tối đa, mỗi câu mang thông tin

---

## 3. Patterns chung xuyên suốt

### Cấu trúc Vấn đề → Giải pháp
Mọi bài đều follow: xác định pain point → trình bày solution → show evidence/example

### Evidence-based
- Số liệu cụ thể: "900+ instances", "16 triệu USD", "$20,000 API cost"
- Test thực tế trước khi viết
- Code blocks, config examples minh họa

### Comparison / Trade-off tables
Luôn có bảng so sánh khi giới thiệu feature mới hoặc 2+ options

### Analogies đời thường
- "Subagents giống freelancer... Agent Teams giống cross-functional team"
- "Không ai thuê cả team 5 người chỉ để fix 1 cái bug"

### Discovery narrative (Substack)
Pattern: "tình cờ thấy X" → phân tích → build/test → chia sẻ kết quả

### "Góc nhìn cá nhân" ở cuối
Bài Substack dài luôn kết bằng personal take - balanced, không hype

---

## 4. Mở bài (hook)

Mở bằng một trong các pattern cụ thể, tránh generic intro:
- Trải nghiệm/số liệu cá nhân: "Tuần trước tôi vừa...", "Sau khi burn $X cho..."
- Observation bất ngờ: "Có chuyện này hơi lạ..."
- Nhận định mạnh có căn cứ

Tránh:
- Định nghĩa hoặc bối cảnh chung chung ("Trong thời đại AI...")
- Câu hỏi tu từ generic ("Bạn đã bao giờ...?")

---

## 5. Cấu trúc & nhịp

- Đoạn 1-3 câu cho social, 3-5 câu cho bài dài
- Ngắt dòng thường xuyên, tránh wall of text
- Khi phân tích nhiều điểm: dùng `1/`, `2/`, `3/` hoặc heading ngắn. Tránh "Thứ nhất, thứ hai..." máy móc
- Chèn in-line commentary trong ngoặc đơn để giữ nhịp trò chuyện. Ví dụ: "(thiệt tình là tôi cũng không ngờ)", "(đừng hỏi vì sao)"

---

## 6. Ngôn ngữ & emphasis

- Tiếng Việt chủ yếu, giữ nguyên thuật ngữ tiếng Anh (CLI, API, agent, hook, skill...)
- KHÔNG dùng em-dash (—) trong Facebook, có dùng trong Substack/blog
- Bold cho emphasis, ít dùng CAPS (khác với Duy)
- VIẾT HOA tiết chế (1-2 từ/bài) khi cần emphasis mạnh hơn bold
- Câu ngắn-vừa, không "wall of text"
- Ngắt dòng nhiều trên FB, heading rõ trên Substack
- Tiêu đề: không viết hoa chữ cái đầu mỗi từ. Ví dụ: "Hôm nay trời đẹp" (không phải "Hôm Nay Trời Đẹp")

---

## 7. Kết bài

Alternative cho CTA máy móc:
- Câu hỏi thật (không tu từ) mở space phản hồi
- Action cụ thể: "Giờ thì [do X] thôi"
- Kết gọn: "Vậy đó.", "Chấm hết."
- Với bài analysis dài: kèm disclaimer khiêm tốn. Ví dụ: "Đây là góc nhìn cá nhân, có thể đúng có thể sai. Bạn có trải nghiệm khác thì share nhé"

---

## 8. Quan trọng (nguyên tắc không đổi)

- KHÔNG bịa số liệu, thông tin
- KHÔNG dùng tone giáo điều "bạn nên", "bạn phải"
- KHÔNG copy nguyên văn từ source, luôn viết lại bằng góc nhìn riêng
- Ưu tiên "tôi đã thử và thấy..." hơn là "theo nghiên cứu..."
- KHÔNG dùng double dash (--) hoặc em dash (—). Dùng dấu phẩy, dấu chấm, hoặc tách câu
- KHÔNG viết AI generic / AI slop. Tránh:
  + Cụm sáo rỗng: "trong thời đại AI", "không thể phủ nhận", "một cách toàn diện", "đáng chú ý là", "điều thú vị là", "let's dive in", "game-changer", "revolutionize", "it's worth noting", "in today's landscape"
  + Mở bài bằng câu hỏi tu từ generic ("Bạn đã bao giờ...?")
  + Kết bài bằng "Bạn nghĩ sao? Comment bên dưới nhé!" máy móc
  + List quá đều đặn "Thứ nhất... Thứ hai... Thứ ba..." khi không cần
  + Giọng văn quá smooth, quá tròn trịa, đọc lên không có personality

---

## 9. Quy tắc cho INSIDE CLAUDEKIT series

Series này nên theo style **GoClaw Blog** (product deep-dive):
- Sections đánh số (01, 02, 03...)
- Tables cho comparisons và feature summaries
- Before/After cho mỗi feature chính
- Impersonal tone - factual, concise
- Code blocks khi relevant
- "Internals" section cho technical details
- Không emoji, không xưng hô casual

Khi cross-post lên **Facebook** - viết bản rút gọn casual hơn:
- Hook mạnh + 3-4 bullet highlights + "Link ở comment 👇"
- Có emoji chọn lọc
- Xưng "mình"

Khi viết bài **Substack** dài - follow analytical style:
- Deep-dive từng feature
- Code examples, architecture
- "Góc nhìn cá nhân" ở cuối
- Xưng "mình/bạn"

---

## 10. Bài học từ session revision (ck-plan-tdd-deep-modes, 2026-04-22)

Các patterns rút ra qua 4 vòng edit và 2 vòng review (fact-check + adversarial):

### 10.1 Bắt đầu bài với Problem thật, tránh drama fake

**Tránh:**
- "3h sáng Slack réo, thứ sáu 17h deploy xong về nhà, điện thoại rung..." — kịch hoá
- Chi tiết fake quá cụ thể: "order #44821", "1-star tăng", "doanh thu hôm nay = 0"
- Screenplay-style 3 dòng quote Slack liên tiếp

**Ưu tiên:**
- Mô tả pattern chung bằng ngôn ngữ khô: "Bạn refactor module lớn. Test pass, merge. Vài ngày sau bug lạ bò ra — từ hàm cũ *gọi vào* module đó."
- Vấn đề thật → câu hỏi thật → dẫn vào solution
- Tiết chế kịch tính, tiết chế moment cụ thể giả

### 10.2 Use cases bắt buộc — không lý thuyết suông

Mọi feature section phải có **2-3 scenario cụ thể** dạng "không có X → có X":

- Kèm disclaimer: "*Các ví dụ dưới đây là scenario giả định, minh hoạ pattern — không phải case study.*" (nếu không phải real case)
- Tránh số liệu bịa: "120k user", "14 file", "0.3% doanh thu" → dùng ngôn ngữ pattern ("nhiều user", "rải rác qua nhiều file")
- Nếu bịa số sẽ đọc như AI-slop ngay lập tức

### 10.3 Best practices + Pitfalls là bắt buộc cho new-user content

Mọi bài hướng dẫn feature mới cần có:
- **Best practices** (5 tips max) — tips để chạy feature hiệu quả
- **Pitfalls** (5-6 bẫy) — flat bullet list, one-liner mỗi bẫy, không dàn heading H3 riêng
- Checklist review nếu relevant (30-giây sanity check)

### 10.4 Tone: tránh overclaim, mềm hoá tuyệt đối

| Overclaim | Phiên bản mềm |
|-----------|---------------|
| "Không có chỗ nào đoán mò" | "Giảm đáng kể phần đoán mò" |
| "Không có chỗ nào deploy xong mới biết hỏng" | "Giảm xác suất phát hiện regression sau deploy" |
| "Luôn rẻ hơn rollback" | "Thường đáng, tuỳ bối cảnh" |
| "X buộc planner đi qua Y" | "X được thiết kế để scout qua Y" |
| "Combo thần thánh" | "Combo an toàn nhất cho refactor lớn" |

Tuyệt đối → có điều kiện. AI speak → human speak.

### 10.5 Taxonomy chính xác — mode vs flag, số step đúng

- Phân biệt rõ "mode" (độc lập) vs "flag" (composable) vs "subcommand"
- Số step/section phải khớp source — fact-check taxonomy trước khi publish
- Nếu source không cấm gì → không viết "source cấm" (phải label là "advice cá nhân")

### 10.6 Cấu trúc bài dài — ít phần hơn tốt hơn

- Target: 9-11 sections cho bài Inside ClaudeKit. Hơn 12 = overlap xảy ra
- Nếu 2 phần nói cùng điểm → merge hoặc một phần thành one-line cross-ref
- "Inside" section chỉ cần 3 ý chính, không cần 6 sub-sections dày

### 10.7 Workflow review 2 vòng

Mỗi bài nên chạy:
1. **Fact-check** (technical accuracy — verify source citations)
2. **Adversarial review** (reader experience + tone + structure — ideally từ model khác qua `/codex:rescue`)

Fact-check bắt mismatch taxonomy. Adversarial bắt overclaim + AI-slop còn sót.

### 10.8 Mổ xẻ internals bằng source-backed claim

Trong "Inside" section:
- Citation cụ thể: `workflow-modes.md:83` hoặc `SKILL.md:113`
- Bảng thay vì prose khi kể số liệu (sub-agent count, step count)
- Kết bằng "Tổng kết mổ xẻ" 3-bullet tổng hợp insight
