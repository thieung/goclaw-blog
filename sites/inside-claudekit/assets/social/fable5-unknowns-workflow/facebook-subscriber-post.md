Anh em đang dùng Fable 5 thế nào rồi?

Fable 5 chỉ được Anthropic cho dùng chung vào subscription quota đến hết ngày 7/7, nên câu hỏi thực tế là: dùng thế nào cho đáng? Dùng vào đâu để không đốt quota vào những việc Sonnet/Opus hoặc skill thường đã xử lý đủ tốt?

Tối qua mình tình cờ đọc tweet của Thariq về “finding your unknowns” thấy quá hay, nên ngồi deep dive tiếp cùng Fable 5. Mình đối chiếu insight đó với các gap hiện tại trong ClaudeKit workflow, rồi đúc rút ra một workflow 6 giai đoạn kèm 3 custom skills để anh em dùng thử 🎁

Nói trước cho rõ: đây là bản beta.

Tối qua và hôm nay mình mới test sơ qua, cơ bản thấy workflow chạy khá ổn. Nhưng “mình thấy ổn trên setup của mình” và “chạy tốt trên nhiều codebase/setup khác nhau” là hai chuyện khác nhau. Đợt này mình muốn nhờ anh em test thêm và cho feedback thật để tinh chỉnh tiếp, nên cứ dùng thoải mái và chê thẳng tay.

3 skill gồm gì?

🔍 `/blindspot`

Chạy trước khi code ở area lạ.

Skill này không giải task giùm bạn. Nó scout codebase + git history để chỉ ra những điểm mù trước khi bạn code: module này từng revert vì gì, commit nào từng làm task tương tự, quality bar ở khu vực này trông ra sao.

Output quan trọng nhất là một prompt sắc hơn để paste vào bước plan.

Mỗi nhận xét của `/blindspot` đều phải chỉ ra nguồn cụ thể: file nào, commit nào, doc nào. Không chỉ ra được nguồn thì bỏ. Report cuối cùng chỉ giữ lại các điểm có căn cứ để bạn kiểm tra tiếp.

📝 `/impl-notes`

Chạy trong khi code.

Trước khi bắt đầu:

`/impl-notes init`

Nó tạo file `implementation-notes.md` trong plan dir.

Trong lúc code, nếu phát hiện phải đổi hướng so với plan:

`/impl-notes log`

Bạn có thể gọi tay. Claude cũng có thể chủ động gọi nếu bạn đã dặn trong workflow/session prompt. Skill này không tự chạy ngầm.

Ghi nhanh 4 ý: plan ban đầu là gì, thực tế phát sinh gì, đã chọn hướng nào, vì sao chọn. Ghi xong đi tiếp, không cần dừng flow giữa chừng.

Sau một lượt code có thay đổi đáng kể, trước khi nghỉ/chuyển phase:

`/impl-notes review`

để gom lại những gì đã lệch plan, quyết định nào đã chốt, và bài học nào cần giữ cho lượt sau. Không nhất thiết là đã xong toàn bộ feature. File này cũng được `/quiz-gate` đọc để tạo câu hỏi.

✅ `/quiz-gate`

Chạy trước khi merge.

Nó sinh một trang HTML giải thích change: context, mental model, blast radius, rồi quiz bạn. Pass 100% mới qua gate.

Sai câu nào thì nó giảng lại rồi hỏi câu mới đúng vào chỗ đó, không hạ chuẩn.

Nghe hơi khó chịu, nhưng đây là cách tốt nhất mình đang dùng để phân biệt “code trông ổn” với “mình thật sự hiểu cái vừa ship”.

Cài thế nào?

1. Tải file zip đính kèm.
2. Giải nén ra 3 folder: `blindspot`, `impl-notes`, `quiz-gate`.
3. Copy cả 3 folder vào `.claude/skills/` của project muốn dùng. Nếu chưa có folder này thì tạo mới.
4. Muốn dùng cho mọi project thì copy vào `~/.claude/skills/` thay vì per-project.
5. Mở Claude Code trong project đó, gõ `/blindspot`, `/impl-notes` hoặc `/quiz-gate` là chạy.

Lưu ý nhỏ: 3 skill này không có prefix `ck:`. Mình cố tình đặt vậy để không đụng ClaudeKit mỗi lần ClaudeKit update.

Về requirement: nên cài sẵn ClaudeKit, vì 3 skill này được thiết kế để phối hợp với `/ck:plan`, `/ck:cook`, `/ck:ship`...

Không bắt buộc, skill vẫn chạy độc lập được. Nhưng có ClaudeKit thì đúng vị full workflow hơn.

Dùng nhanh theo 3 tình huống phổ biến:

1️⃣ Sắp code ở area lạ

`/blindspot "thêm auth provider, mình chưa đụng module auth"`

Đọc report, lấy “better prompt”, paste vào `/ck:plan`.

2️⃣ Đang cook một plan

Chạy `/impl-notes init` trước phase 1.

Đang code gặp chỗ lệch plan thì `/impl-notes log`, ghi nhanh lý do, rồi code tiếp.

Cuối session chạy `/impl-notes review`.

3️⃣ Xong feature, chuẩn bị merge

Chạy `/quiz-gate`.

Làm quiz, pass 100% rồi hẵng `/ck:git` hoặc `/ck:ship`.

Bonus: review PR người khác thì dùng:

`/quiz-gate --pr <số PR>`

Quiz là cách đọc PR sâu nhất mình từng thử tới giờ.

Feedback mình cần, càng cụ thể càng tốt:

(a) Skill có tự trigger đúng lúc không, hay toàn phải gọi tay?

(b) Findings của `/blindspot` có trúng codebase của bạn không, hay vẫn generic kiểu ai cũng đoán được?

(c) Câu hỏi của `/quiz-gate` có test hiểu biết thật không, hay nhìn diff là đoán ra đáp án?

(d) `/impl-notes` có làm phiền flow đang code không? Log một entry mất khoảng bao lâu?

(e) Bạn chạy trên setup nào: model gì, Fable/Opus/Sonnet; project loại gì, web/mobile/backend; đã cài ClaudeKit chưa?

Comment trực tiếp dưới post này hoặc DM mình đều được.

Chê càng cụ thể càng quý. Ví dụ “quiz câu 3 đoán được vì option A với B vô lý quá” giá trị hơn nhiều so với “ok đấy” 😄

Cam kết vòng lặp: mình sẽ tổng hợp feedback, tinh chỉnh, rồi release bản tiếp theo ngay trong nhóm.

Đúng tinh thần rule of three trong guide: friction nào lặp lại từ 3 người hoặc 3 lần trở lên thì mình sửa system, không sửa theo cảm hứng.

File zip đính kèm dưới post 👇

Bản HTML guide mình share tối qua vẫn là tài liệu đọc kèm tốt nhất. Ai chưa đọc thì nên đọc trước khi cài.

Chúc anh em tìm được nhiều unknowns trước khi chúng tìm được mình 🕵️
