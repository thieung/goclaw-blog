---
title: "Agent tạo ảnh gpt-image-2 + skill prompt-pro-max"
project: goclaw
version: v3.11.0
status: draft
created: 2026-05-01
slug: agent-tao-anh-gpt-image-2-skill-pro-max
---

[←](https://goclaw.thieunv.space/)

ChatGPT Pro subscription mở quota `gpt-image-2`. PR #1002 wire tool `create_image` của GoClaw vào pipeline native qua Codex OAuth (Codex = client OAuth flow GoClaw dùng để gọi OpenAI Responses API mà không cần API key). Skill `gpt-image-2-pro-max` (community contributor maintain, license CC BY 4.0) đẩy thêm ~370 prompt template + agent guidance qua MCP (Model Context Protocol — chuẩn để agent gọi tool external server). Ghép 2 thứ → agent tự brainstorm prompt → sinh ảnh chất lượng poster, không phát sinh API key cost.

Bài mổ xẻ wire format Codex Responses API, gating 2 tier, PNG provenance, và workflow MCP-based prompt registry.

---

## 01 — Vấn đề trước PR #1002

### `create_image` cũ chỉ chạy được với API key

Trước PR #1002, tool `create_image` trong GoClaw resolve qua `credentialProvider` interface — yêu cầu provider trả về `APIKey()` và `APIBase()`. Codex/ChatGPT OAuth không có cả hai (token rotate qua refresh, base URL là `chatgpt.com/backend-api`, không phải `api.openai.com`).

Hệ quả: subscription ChatGPT Pro có `gpt-image-2` ở quota, nhưng agent không gọi được. Đa số user phải đi đường API key. Path phổ biến: **Gemini Nano Banana 2** qua **OpenRouter** vì:

- Quality ổn cho hầu hết use case (poster, thumbnail, illustration).
- OpenRouter cho phép xài 1 key duy nhất cho nhiều image gen model, không phải quản lý API key OpenAI / Google riêng biệt.
- Pay-per-image, không phát sinh subscription thứ hai.

Còn lại là các provider khác trong chain default của GoClaw: `openai` (gpt-image-1.5, DALL-E 3), `gemini` (Imagen / Nano Banana qua direct API), `minimax`, `dashscope`, `byteplus`. DALL-E 3 quality kém hơn Nano Banana 2 / gpt-image-2 ở prompt phức tạp + text rendering trong ảnh.

Vấn đề: user **đã trả** ChatGPT Pro hằng tháng cho coding workflow, gpt-image-2 thuộc model gen ảnh chất lượng tốt nhất hiện tại — nhưng quota đó nằm yên không xài được trong agent.

| Trước PR #1002 | Sau PR #1002 |
|---|---|
| Yêu cầu APIKey + APIBase | Native qua OAuth token |
| Nano Banana 2 (OpenRouter) / gpt-image-1.5 | gpt-image-2 (default) qua quota subscription |
| Pay-per-image phát sinh | Đã trả qua subscription |
| Timeout 120s × 2 retry | Timeout 600s × 1 retry |
| Không có prompt provenance | PNG `tEXt` chunk embed |
| 1 tier gate (provider có credential?) | 2 tier (capability + agent config) |

### Prompt engineering phân tán

Cộng đồng `gpt-image-2` chia sẻ prompt template trên X/Twitter rời rạc. EvoLinkAI maintain repo `awesome-gpt-image-2-prompts` (~370 cases) nhưng dạng README + tweet links, không có search engine. Agent muốn brainstorm phải scrape thủ công.

---

## 02 — Kiến trúc native image cho OAuth

PR #1002 thêm interface mới ở `internal/providers/native_image.go`:

```go
type NativeImageProvider interface {
    GenerateImage(ctx context.Context, req NativeImageRequest) (*NativeImageResult, error)
}
```

Tool `create_image` resolve provider qua `MediaProviderChain`. Khi chain entry là Codex OAuth, raw provider object được inject vào `params["_native_provider"]`. Trong `callProvider`:

```go
if rawProvider, ok := params["_native_provider"]; ok {
    if np, ok := rawProvider.(providers.NativeImageProvider); ok {
        // Native path — không cần APIKey/APIBase
        return np.GenerateImage(ctx, ...)
    }
}
if cp == nil {
    return error("provider does not expose API credentials")
}
// Credential path cho openai, gemini, minimax, dashscope, byteplus, openrouter
```

Native check chạy **trước** `cp == nil` guard. OAuth provider không expose credential intentionally — nếu check sau sẽ fail oan.

### 2 tier gate

Tool `image_generation` chỉ được attach vào request khi cả 2 điều kiện thoả:

1. **Provider capability**: provider implement `CapabilitiesAware` và `Capabilities().ImageGeneration == true`. Codex provider hardcoded `true` (OpenAI Responses API support `image_generation` tool).
2. **Agent config**: `AllowImageGeneration` field trong `AgentConfig`, mặc định `true`. Admin set `other_config.allow_image_generation: false` để cấm.

Logic trong `loop_tool_filter.go::buildFilteredTools`:

```go
if l.allowImageGeneration {
    if aware, ok := l.provider.(providers.CapabilitiesAware); ok {
        if aware.Capabilities().ImageGeneration {
            toolDefs = append(toolDefs, imageGenToolDef)
        }
    }
}
```

`imageGenToolDef` là sentinel `{Type: "image_generation"}` — không có `function` wrapper, không có parameters. Codex Responses API tự hiểu.

---

## 03 — Codex Responses API wire format

Endpoint: `POST {apiBase}/codex/responses`. Body có vài quirk lớn:

```go
map[string]any{
    "model":        "gpt-5.4",  // parent LLM, không phải image model
    "stream":       true,        // mandatory — false bị reject HTTP 400
    "store":        false,
    "instructions": "Generate an image matching the user's description using the image_generation tool. Return only the image; do not describe it in text.",
    "input":        []any{...user message...},
    "tools": []map[string]any{{
        "type":          "image_generation",
        "action":        "generate",
        "model":         "gpt-image-2",   // image model nằm ở đây
        "output_format": "png",
        "size":          "1024x1024",
    }},
    "tool_choice": map[string]any{"type": "image_generation"},  // force tool call
}
```

### Quirks

- `stream: true` **bắt buộc** — non-streaming bị reject với `Stream must be set to true`.
- `instructions` phải có giá trị non-empty và rõ ràng. Để trống → model có thể trả text mô tả thay vì gọi tool.
- `tool_choice` phải force `image_generation`, không thì model có thể skip tool.
- Có 2 model trong cùng request: `model` (parent — gpt-5.4) và `tools[0].model` (image — gpt-image-2). Nhầm 2 cái → API error mơ hồ.

### Parse response

Path chính: SSE stream (do `stream:true` mandatory). Code có thêm non-streaming JSON parse như defensive fallback — nếu server bất ngờ trả raw JSON object (không phải `data:` lines), `parseNativeImageResponse` walk `output[]` tìm `type == "image_generation_call"`, base64 decode `result`. Không trigger được bằng cách set `stream:false` (sẽ bị reject 400 trước).

SSE path: scan `data:` lines, ưu tiên 2 event:
- `response.output_item.done` — image item ready, lấy `event.Item.Result` (base64) + `OutputFormat`.
- `response.completed` — final usage tokens, walk `event.Response.Output[]` lần 2 nếu chưa thấy item.

```go
for line := range bytes.SplitSeq(data, []byte("\n")) {
    if !bytes.HasPrefix(line, []byte("data: ")) { continue }
    payload := line[len("data: "):]
    if bytes.Equal(payload, []byte("[DONE]")) { break }
    // ... unmarshal event, switch event.Type
}
```

---

## 04 — Model whitelist + chain config

### Whitelist server-side

```go
var allowedImageModels = map[string]bool{
    "gpt-image-2":   true, // default — latest quality
    "gpt-image-1.5": true, // legacy fallback
}
```

`ValidateImageModel` reject mọi value khác (vd `dall-e-3`) ngay tại provider — không để upstream silently reject. User chọn model qua chain entry param `image_model`, threaded vào `NativeImageRequest.ImageModel`, validate, gắn vào `tools[0].model` của Responses API request.

### Chain config

`MediaProviderChainEntry` mặc định:

```go
Timeout    int  // seconds, default 600 (10 min — image/video gen is slow)
MaxRetries int  // default 1 (image gen rarely succeeds on retry)
```

Tăng timeout từ 120s lên **600s** vì gpt-image-2 thực tế mất 30–180s. Mid-flight timeout để lại orphan upstream work — retry vô nghĩa, nên giảm `MaxRetries` từ 2 xuống **1**. Surface failure fast hơn là hide bằng retry loop.

UI phơi schema này ở `ui/web/src/pages/builtin-tools/media-provider-params-schema.ts` — admin chỉnh per-tenant, per-tool.

---

## 05 — Provenance: PNG tEXt chunk + caption UI

Khi `create_image` save file, `pngEmbedPrompt` (counterpart trong `tools/png_embed.go` để tránh import cycle tools→agent) rewrite PNG byte stream chèn 1 `tEXt` chunk `Description` vào trước IEND:

```
Description = <prompt user gửi>
```

PNG `tEXt` format chuẩn:
```
4 bytes  length
4 bytes  chunk type "tEXt"
N bytes  keyword\0text
4 bytes  CRC32
```

(Module `agent.EmbedPNGPrompt` có thêm chunk `Software = goclaw` nhưng path `create_image` hiện tại không gọi vào module đó — chỉ embed `Description`.)

Function tự skip nếu input không có PNG signature (8 byte magic) hoặc không tìm thấy IEND chunk. Failure mode: trả nguyên bytes cũ, không error.

Hệ quả: prompt origin **đi theo file download**. User mở ảnh trong Photoshop / Preview / `exiftool` → thấy ngay prompt gốc. Reverse engineer agent output dễ hơn, debug nhanh hơn.

File được lưu theo path: `{workspace}/generated/{YYYY-MM-DD}/image_{hint}_{timestamp}.png`. Workspace resolve từ tool context, fallback `os.TempDir()` nếu thiếu.

---

## 06 — Skill `gpt-image-2-pro-max`: prompt registry qua MCP

Skill `gpt-image-2-pro-max` là community skill do 1 contributor của GoClaw open-source project maintain, license CC BY 4.0. Backend cấp prompt registry qua MCP `streamable-http` transport — agent treat skill như tool external, không phải pip install local Python.

### Corpus

~370 prompts từ `EvoLinkAI/awesome-gpt-image-2-prompts` (X/Twitter creators + community demo). Tag được derive qua 10 facet vocabulary: `subjects`, `styles`, `lighting`, `cameras`, `moods`, `palettes`, `compositions`, `mediums`, `techniques`, `usecases`. Mỗi prompt record có stable ID dựa trên tweet anchor — corpus re-buildable từ upstream, append-only khi có prompt mới.

### MCP tools

```
search_prompts(query, n?, shape?, source?, author?, has_image?)
get_prompt(id)
list_facets(facet?)
```

Search ranking là full-text + tag boost (tag-slug match query token được cộng điểm). Agent gọi qua tool prefix (vd `prompts_search_prompts`). Mỗi result trả: `prompt_text`, `tags.{moods,palettes,subjects,...}`, `author`, `twitter_link`, `image_url` (nếu có).

---

## 07 — Integrate skill vào agent GoClaw

### Config MCP server

Add vào `goclaw config.json` (URL backend lấy từ tài liệu skill, placeholder dưới đây dùng `<skill-backend-url>`):

```jsonc
{
  "tools": {
    "mcp_servers": {
      "prompts": {
        "transport": "streamable-http",
        "url": "<skill-backend-url>/mcp",
        "headers": {
          "Authorization": "Bearer env:PROMPTS_API_KEY"
        },
        "tool_prefix": "prompts_",
        "timeout_sec": 30
      }
    },
    "allow": [
      "create_image",
      "prompts_search_prompts",
      "prompts_get_prompt",
      "prompts_list_facets"
    ]
  }
}
```

Set `PROMPTS_API_KEY` (token cấp bởi skill maintainer) ở env trước khi launch agent.

### Agent guidance

Append vào system prompt của agent (GoClaw inject system prompt từ các file convention `SOUL.md` / `AGENTS.md` trong workspace):

```markdown
## Image generation workflow

Khi user yêu cầu ảnh:

1. Gọi `prompts_search_prompts` với query combine product + shape + mood + palette
   (vd `"luxury platform sandal editorial cream pastel"`).
2. Inspect top results — pick record có `tags.moods` và `tags.palettes` match brief.
   Reject mismatch rõ ràng (đừng dùng `noir` base cho brief `pastel feminine`).
3. Lấy `prompt_text` từ record. Refactor: thay product-specific values theo brief,
   giữ nguyên mood/lighting/style words.
4. Gọi `create_image` với prompt đã refactor.
5. Trong reply, attribute source: cite `author` và `twitter_link`.
```

### Trace 1 turn

User brief: *"poster cao điểm Tết với cáo đỏ Việt Nam, style infographic"*

1. Agent → `prompts_search_prompts(q="lunar new year fox infographic poster", n=5, has_image=true)`
2. Worker BM25 match, return top-5 record + reference image links
3. Agent inspect tags, pick 1 record có `style: infographic` + `mood: festive`
4. Agent refactor prompt: thay subject thành "red fox", chèn detail "Vietnamese tet decorations, lì xì, mai blossom"
5. Agent → `create_image(prompt=<refactored>, aspect_ratio="3:4")` — bước này dispatch xuống native path mô tả ở section 02; chi tiết lifecycle ở section 10.
6. Agent reply kèm citation: `Inspired by @<author> — <twitter_link>`

---

## 08 — Use cases thực tế

*Các ví dụ dưới đây minh hoạ pattern, không phải case study cụ thể.*

### Use case 1: Marketing team in-house

Team marketing nội bộ dùng chung 1 GoClaw instance, share quota của subscription ChatGPT Pro chung.

**Không có combo:** mỗi designer phải gọi image API riêng (Midjourney / Imagen / DALL-E), phát sinh subscription song song và brand consistency rời rạc giữa các tools.

**Có combo:** agent tạo poster series từ brief sheet. Skill ghim mood/palette consistent giữa các poster. Không phát sinh API key cost thêm — quota subscription đã trả. PNG `Description` chunk giúp brand manager audit prompt origin về sau.

### Use case 2: Solo content creator

Creator viết substack đều đặn, cần thumbnail cinematic.

**Không có skill:** prompt tự nghĩ, hit-or-miss. Lặp nhiều lần mới ra ảnh khớp brand tone.

**Có skill:** `prompts_search_prompts q="cinematic substack thumbnail moody"` → agent inspect, pick template documentary low-light editorial của community creator, refactor theo topic tuần này. Số lần lặp giảm đáng kể, output bám brand tone tốt hơn vì base template đã được community validate.

### Use case 3: Agency client work

Agency làm visual cho client F&B. Brief: "ramen ad, vintage Japanese diner".

**Không có skill:** designer scroll moodboard tham khảo trước khi prompt — overhead manual.

**Có skill:** agent search `q="ramen vintage japanese editorial"`, trả N prompt tested với reference image. Pick 1 ramen-shop record, refactor theo client brand. Designer review trên output candidate — vòng feedback ngắn lại, không phải bắt đầu từ moodboard zero.

---

## 09 — Best practices

5 tips để chạy combo này hiệu quả:

1. **Search query nên chứa cả shape + mood + palette**, không chỉ subject. `"red fox"` ra noise; `"red fox infographic festive"` ra signal.
2. **Đừng skip refactor step.** Agent dễ lười copy nguyên `prompt_text` của template — output trùng lặp template author. Phải thay subject-specific values.
3. **Cite author mỗi lần surface ra user.** Skill `gpt-image-2-pro-max` license CC BY 4.0 (attribution required). Corpus EvoLinkAI upstream cũng community-driven, có section `Acknowledge` liệt kê tác giả từng tweet. Cite `author` + `twitter_link` của record trong reply — vừa đúng license, vừa cho creator gốc visibility.
4. **Đừng giảm chain timeout xuống 300s như default chat.** Default 600s phù hợp với latency thực tế gpt-image-2 (range 30–180s, burst có thể cao hơn). Nếu chain timeout chạm trần → orphan upstream work, retry vô nghĩa.
5. **Test với agent config `AllowImageGeneration: false`** trên môi trường staging. Có một tier production cần cấm sinh ảnh (vd: customer-facing chatbot). 2-tier gate nên được verify, đừng giả định.

### Pitfalls

- Quên set `tool_prefix` trong MCP config → tool name collide với built-in nếu skill thêm tool tên `search_prompts`.
- `PROMPTS_API_KEY` không có ở env → MCP server fail silent, agent không biết, fall back vào prompt tự nghĩ.
- Set `image_model: "dall-e-3"` ở chain entry → `ValidateImageModel` reject, lỗi trả về user mà chain không fallthrough sang provider khác (whitelist là hard fail).
- Agent skip cite author → vi phạm corpus license + lost discoverability cho tweet creator.
- Workspace không writable → save fail, agent reply MEDIA path không tồn tại, user 404.
- Quên `stream: true` khi tự build Codex Responses request từ tool khác → API reject HTTP 400.

### Checklist 30-giây sanity

- [ ] `prompts_*` tools xuất hiện trong agent tool list?
- [ ] `create_image` ở `tools.allow`?
- [ ] Codex provider có ImageGeneration capability?
- [ ] Agent config `AllowImageGeneration` không bị set false?
- [ ] `PROMPTS_API_KEY` ở env?

---

## 10 — Inside

### Files chính

| File | Vai trò |
|---|---|
| `internal/providers/native_image.go` | Interface `NativeImageProvider`, `ValidateImageModel`, `SizeFromAspect` |
| `internal/providers/codex_native_image.go` | Codex impl: build body, parse JSON / SSE |
| `internal/tools/create_image.go` | Tool entry point, chain resolution, native path dispatch |
| `internal/tools/media_provider_chain.go` | Chain timeout 600s, max_retries 1 default |
| `internal/tools/png_embed.go` | `pngEmbedPrompt` — "Description" tEXt chunk before IEND (path runtime của `create_image`) |
| `internal/agent/png_metadata.go` | `EmbedPNGPrompt` 2-chunk version (`Description` + `Software`) — không trigger từ `create_image` path hiện tại |
| `internal/agent/loop_tool_filter.go` | 2-tier gate: capability AND `allowImageGeneration` |

### Lifecycle 1 request

```
agent loop iteration N
  ↓ buildFilteredTools()
  → check Loop.allowImageGeneration  ← (gate 1)
  → check provider.Capabilities().ImageGeneration  ← (gate 2)
  → append imageGenToolDef sentinel
  ↓ provider.Chat(messages, tools)
  → Codex thấy image_generation trong tools, có thể tự call (nếu user yêu cầu ảnh)
  → hoặc agent gọi create_image tool, ExecuteWithChain → NativeImageProvider
  ↓ CodexProvider.GenerateImage()
  → buildNativeImageRequestBody (stream:true, tool_choice forced)
  → POST /codex/responses → SSE stream
  → parseNativeImageSSE → base64 decode → PNG bytes
  ↓ embedPromptIntoPNG (tools/create_image.go) → pngEmbedPrompt (tools/png_embed.go)
  → "Description" tEXt chunk inserted before IEND
  ↓ os.WriteFile workspace/generated/YYYY-MM-DD/
  → Result.Media → bus → UI render lightbox
```

### Skill backend

Backend skill `gpt-image-2-pro-max` được host bởi maintainer (community contributor của GoClaw open-source, license CC BY 4.0). Agent chỉ cần config MCP `streamable-http` URL + Bearer token; chi tiết infra, ranking formula thuộc về scope skill repo, không phải tích hợp GoClaw.

Edge-deployed → cold start nhanh, search latency thấp đủ để chạy in-loop trong agent turn (≪ 1s overhead so với latency gpt-image-2 30–180s).

---

## Tổng kết

PR #1002 mở native path cho image generation: provider OAuth không cần API key, route qua `NativeImageProvider` interface, gate 2 tier (capability + agent config), wire format Codex Responses API với `stream:true` mandatory + `tool_choice` forced, whitelist 2 model, chain timeout 600s × 1 retry, PNG `tEXt` provenance chunk.

Skill `gpt-image-2-pro-max` (community contributor maintain, license CC BY 4.0) cấp prompt registry qua MCP: ~370 template từ X creators, full-text search với tag boost, transport `streamable-http`. Agent ghép cả 2 → workflow search → refactor → generate → cite, không phát sinh API key fee, prompt provenance đi theo file qua PNG `Description` chunk.

Cost: không phát sinh API key fee (xài quota subscription đã trả, vẫn tính vào quota ChatGPT Pro). Gain: prompt quality áp dụng được community knowledge có sẵn, brand consistency, audit trail prompt qua PNG `Description` chunk.
