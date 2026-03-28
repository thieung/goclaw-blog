# GoClaw Release Version Analysis — Blog Topic Mapping

## Overview
Complete analysis of GoClaw feature releases (v2.24.0 → v2.7.0). Each version lists all features, identifies type (feature/bugfix), selects single best blog topic, and provides visual/narrative guidance.

---

## FEATURE RELEASES (CANDIDATES FOR BLOG POSTS)

### v2.24.0 (2026-03-26)
**Type:** Feature
**Release Date:** March 26, 2026

**All features:**
- Yield mention mode for Telegram — multi-bot group support enabling bots to coexist without @mention requirement
- Improved mention detection across channels
- Display name support in Telegram channel config
- UI/i18n improvements for mention mode labels (user-friendly "Multi-bot" terminology)

**Blog topic:** Multi-Bot Telegram Groups with Yield Mention Mode
**Why:** Visually demonstrates practical real-world use case (shared group with multiple bots) with clear before/after UX differences. Unique feature not found in competing platforms.
**Visual ideas:**
- Animation showing 3 bots in group, one responding to message (strict mode), then switching to yield mode where all respond unless explicitly @mentioned
- Screenshot progression: strict mode config → yield mode config
- Interaction flowchart: message → bot decision tree (has @mention? who? respond?)

---

### v2.23.0 (2026-03-26)
**Type:** Feature
**Release Date:** March 26, 2026

**All features:**
- Exclude MCP bridge tools from read-only streak detector — legitimate external integrations treated as neutral
- Improved read-only detection logic for tool chains

**Blog topic:** Fixing False Positives in Agent Safety — MCP Tools & Read-Only Detection
**Why:** Deep technical system design topic that addresses non-obvious architecture challenge. Shows GoClaw's thoughtful safety mechanisms and how they handle edge cases.
**Visual ideas:**
- Before/after: timeline of agent run hitting "stuck in read-only loop" false positive with MCP tools
- Flowchart: tool classification logic → decision tree for read/write categorization
- Trace visualization: mcp_query_inbox → mcp_parse_emails → mcp_summarize seen as invalid loop vs legitimate workflow

---

### v2.22.0 (2026-03-26)
**Type:** Feature
**Release Date:** March 26, 2026

**All features:**
- Stop button for running traces — admins can abort long-running agent sessions from traces page
- Abort response handling improvements
- UI/UX refinements for destructive actions

**Blog topic:** Real-Time Agent Execution Control — Stop Button for Traces
**Why:** Practical operational feature that directly improves developer experience. Shows real-time observability & control story.
**Visual ideas:**
- Screen recording: running trace in progress → click stop button → agent gracefully halts with abort message
- Before/after: without stop button (no control) → with stop button (instant termination)
- Architecture: how abort signal propagates through agent loop to gracefully shutdown tools

---

### v2.21.0 (2026-03-25)
**Type:** Feature
**Release Date:** March 25, 2026

**All features:**
- Conversation-wide image gallery with prev/next navigation (arrow keys)
- Image counter display
- Session state restore for IsRunning/activity state on switch
- Chat layout fixes (TaskPanel overflow prevention)
- Session status RPC for state synchronization

**Blog topic:** Image Gallery & Session State Restoration in Chat
**Why:** UX-focused feature with immediate visual appeal and cross-functional improvements. Shows polished chat experience.
**Visual ideas:**
- Demo: chat with 15+ images → click gallery button → arrow-key through full conversation context
- Before/after: running indicators lost on session switch (v2.20) → restored with visual continuity (v2.21)
- Layout fix visualization: side-by-side of TaskPanel causing overflow vs. fixed flex layout

---

### v2.20.0 (2026-03-25)
**Type:** Feature
**Release Date:** March 25, 2026

**All features:**
- Task board persistence across session switches via teams.tasks.active-by-session RPC
- Session-aware task filtering
- Improved team collaboration workflow

**Blog topic:** Persistent Task State Across Agent Sessions
**Why:** Core team collaboration feature. Addresses pain point where switching between sessions loses context of active work.
**Visual ideas:**
- Flow: user in session A with running task → switch to session B → task list auto-restores with active status maintained
- Before/after: v2.19 (no restore, manual refresh needed) → v2.20 (automatic RPC pull)
- Database schema: teams_tasks linking to session_id for filtering logic

---

### v2.19.0 (2026-03-25)
**Type:** Feature
**Release Date:** March 25, 2026

**All features:**
- Chunk overlap support for memory (default 200 tokens)
- Context continuity at semantic search boundaries
- Per-agent chunk_len and chunk_overlap configuration
- Per-agent memory system config in UI
- Persistent configuration via system_configs table

**Blog topic:** Semantic Memory with Chunk Overlap — Improving Context Continuity
**Why:** Foundational AI feature showing deep understanding of RAG/vector search limitations. Technically sophisticated with immediate user impact.
**Visual ideas:**
- Animation: chunk boundary without overlap (context loss) → with 200-token overlap (smooth continuity)
- Visualization: document split into chunks with overlap zones highlighted
- Before/after: memory query missing context at boundaries → with overlap, full context preserved
- Diagram: ChunkText() algorithm showing safety clamp at maxChunkLen/2

---

### v2.18.0 (2026-03-25)
**Type:** Feature
**Release Date:** March 25, 2026

**All features:**
- Data-driven embedding dimension configuration (per-provider)
- Default 1536 dims to match pgvector schema
- Multi-provider support (OpenAI, Gemini, Cohere, DashScope)
- Dimension truncation for provider compatibility
- System Settings modal for verification endpoint configuration

**Blog topic:** Embedding Dimensions Across Multi-Provider Models
**Why:** Infrastructure topic essential for production deployments with diverse embedding providers. Solves concrete operational pain.
**Visual ideas:**
- Comparison table: OpenAI 1536d vs Gemini variable dims vs Cohere 4096d → normalization to 1536
- Before/after: hardcoded Gemini truncation (fragile) → configurable per-provider (flexible)
- Flow: embedding config → verify endpoint → dimension check → insert to pgvector
- System Settings UI screenshot showing dimension inputs for each provider

---

### v2.17.0 (2026-03-25)
**Type:** Feature
**Release Date:** March 25, 2026

**All features:**
- Browser timeout protection (30s per-action default, configurable)
- Idle page auto-close after 10 min (prevents resource leaks)
- Max pages per tenant (default 5, LRU eviction)
- RefStore cleanup on close/evict/reap to prevent memory leaks
- Safety mechanisms for long-running browser sessions

**Blog topic:** Taming Browser Automation — Timeout, Idle Close, & Resource Limits
**Why:** Critical reliability/production-hardening feature. Shows thought-out resource management for long-running agent tools.
**Visual ideas:**
- Timeline: browser action lifecycle → timeout fires at 30s → auto-close after 10min idle
- Before/after: v2.16 runaway browser sessions consuming RAM → v2.17 automatic cleanup
- Memory graph: 5 concurrent pages under LRU eviction vs unlimited growth
- Diagram: RefStore lifecycle tied to page close/evict/reap events

---

### v2.14.0 (2026-03-17)
**Type:** Feature
**Release Date:** March 17, 2026 (estimated)

**All features:**
- Realtime comment/attachment counters on task cards
- Team.task.commented and team.task.attachment_added event subscriptions
- Toggleable task panel sidebar (auto-open on dispatch, auto-close on completion)
- Mobile slide-over layout with backdrop
- Inline notification toast on counter increment
- RichContent deduplication

**Blog topic:** Real-Time Team Task Notifications & Live Counters
**Why:** Flagship team collaboration feature with multi-device support and real-time event streaming. Shows polished product thinking.
**Visual ideas:**
- Video: agent dispatches task → comment added in parallel session → counter increments in real-time with toast
- Before/after: manual refresh to see task updates (v2.13) → live counter + auto-notifications (v2.14)
- Mobile demo: slide-over panel with backdrop on narrow screens
- Event flow diagram: team.task.commented → EventBus → chat subscriber → UI update

---

### v2.11.0 (2026-03-17)
**Type:** Feature
**Release Date:** March 17, 2026 (estimated)

**All features:**
- File upload limit bump from 10MB to 50MB
- Protected dirs expanded (media/, tenants/) — prevent system-directory overwrites
- Improved upload quota per scope (100-file limit)
- Symlink escape prevention in upload handlers

**Blog topic:** Scaling File Uploads & Securing Protected Directories
**Why:** Operations/security-focused feature. Practical improvement visible in daily usage.
**Visual ideas:**
- Before/after: 10MB limit (restrictive) → 50MB (practical for media)
- Diagram: protected dir hierarchy (system/ vs writable teams/custom/)
- Screenshot: error when attempting to upload to protected media/ dir with validation feedback

---

### v2.10.0 (2026-03-17)
**Type:** Feature
**Release Date:** March 17, 2026 (estimated)

**All features:**
- File upload to Team Workspace and Storage pages via web UI
- POST /v1/teams/{teamId}/workspace/upload endpoint with tenant isolation
- POST /v1/storage/files endpoint with admin-only protection
- Reusable FileUploadDialog component (drop zone, multi-file, per-file status)
- Real-time EventWorkspaceFileChanged broadcast
- Blocked extension validation

**Blog topic:** Direct File Upload to Team Workspace — Bridging Admin & Agent Workflows
**Why:** Practical collaboration feature eliminating manual file copy-paste. Shows thoughtful file security model.
**Visual ideas:**
- Demo: admin drags files to workspace → agents immediately read with read_file tool
- Before/after: manual scp/kubectl cp (v2.9) → drag-drop UI (v2.10)
- Technical: tenant isolation + path traversal prevention + symlink escape checks
- UI components: FileUploadDialog anatomy with drop zone highlight, per-file progress

---

### v2.9.0 (2026-03-17)
**Type:** Feature
**Release Date:** March 17, 2026 (estimated)

**All features:**
- system_configs DB table for per-tenant key-value configuration
- System Settings modal (navbar gear icon) with 3 sections: Embedding, UX Behavior, Pending Compaction
- Per-tenant config isolation (no cross-tenant fallback)
- ApplySystemConfigs overlay for DB → in-memory config at startup + on save
- Tool status toggle, block_reply toggle, intent_classify toggle
- Embedding verification endpoint with custom provider support

**Blog topic:** System Settings Dashboard — Centralizing Configuration for Multi-Tenant Deployments
**Why:** Operations feature enabling non-developer config management. Shows thoughtful multi-tenant architecture.
**Visual ideas:**
- UI walkthrough: System Settings modal showing all 3 sections
- Before/after: config.json edits (v2.8) → settings modal (v2.9) for operators
- Diagram: config flow from DB → memory overlay → runtime behavior
- Tenant isolation architecture: per-tenant keys with strict isolation checks

---

### v2.8.0 (2026-03-17)
**Type:** Feature
**Release Date:** March 17, 2026 (estimated)

**All features:**
- Smart post-turn task decision engine (TaskActionFlags context tracking)
- Member tool call tracking (Completed, Reviewed, Escalated, Progressed, Commented, Claimed)
- Flag-based auto-complete switch/case (replace aggressive auto-complete)
- Stale in_review task detection (4-hour TTL)
- Orphaned blocked task recovery (all blockers terminal)
- Task re-dispatch on lock recovery preserving dependent blocking
- Notification-kind runs with read-only enforcement in TeamTasksTool
- ResetTaskStatus support for cancelled/in_review

**Blog topic:** Intelligent Task Lifecycle Management — From Dispatch to Completion
**Why:** Core team system showing sophisticated state machine design. Addresses real multi-agent coordination challenges.
**Visual ideas:**
- State machine diagram: pending → in_progress → in_review → completed (with all transitions)
- Timeline: member tool call → ActionFlag → decision logic → auto-complete or renew lock
- Before/after: aggressive auto-complete causing premature closure (v2.7) → smart flags (v2.8)
- Stale detection visualization: 4-hour timer on in_review tasks with auto-mark-stale

---

### v2.7.0 (2026-03-17)
**Type:** Feature
**Release Date:** March 17, 2026 (estimated)

**All features:**
- About GoClaw dialog (version, source, license, docs, bug report links)
- Version update checker integration
- Clean version display (strip git commit hash)
- Update status badges ("Up to date" / "New version available")
- Version display in System Health card
- Docker VERSION build arg support
- i18n for version/update UI (en/vi/zh)

**Blog topic:** Version Management & User-Facing Status — Building Transparent Product Experience
**Why:** UX/operations feature showing polish. Demonstrates attention to user communication about product health.
**Visual ideas:**
- UI walkthrough: About dialog with version, update status, links
- Before/after: opaque version display (v2.6) → clean user-friendly version in multiple places (v2.7)
- Update flow: version check → fetch latest → display status badge
- System Health card showing version with up-to-date indicator

---

## SKIPPED VERSIONS (BUGFIX ONLY)

These versions contain only bug fixes and operational improvements, not new features worthy of standalone blog posts:

- **v2.16.0** (2026-03-25) — Query param stripping from file blocks
- **v2.15.0** (2026-03-25) — Media deduplication and file healing
- **v2.13.0** (2026-03-17) — Per-tenant skill config, tenant isolation, refactoring
- **v2.12.0** (2026-03-17) — Docker hardening, store refactoring, cron fixes

---

## ALREADY COVERED VERSIONS

- **v2.34.0** — Codex OAuth Pools (DONE)
- **v2.24.0** — Yield Mention Mode (DONE in this analysis, previously marked as Codex OAuth but primary feature is Telegram multi-bot)

---

## SUMMARY BY THEME

**Real-Time Collaboration:**
- v2.24.0: Multi-bot Telegram groups
- v2.22.0: Stop button for traces
- v2.21.0: Image gallery & session state
- v2.20.0: Task persistence across sessions
- v2.14.0: Real-time task notifications

**AI/Memory Features:**
- v2.19.0: Chunk overlap for semantic memory
- v2.18.0: Embedding dimension configuration

**Browser & Tool Reliability:**
- v2.17.0: Browser timeout & resource limits

**Team Coordination:**
- v2.8.0: Task lifecycle state machine

**File Management:**
- v2.11.0: Upload limits & protected dirs
- v2.10.0: UI file upload to workspace

**System Operations:**
- v2.9.0: System Settings modal
- v2.7.0: Version management & updates

---

## UNRESOLVED QUESTIONS

1. **v2.34.0 Codex OAuth Pools** — Is this a real version that exists beyond v2.24.0, or was the task description referencing future work? Latest tag is v2.24.0.

2. **Detailed feature architecture** — Some versions (especially v2.8-v2.11 era) have limited commit messages. Should we pull additional PR details from GitHub for deeper blog research?

3. **Blog post depth trade-offs** — Should some versions be combined? (e.g., v2.10 + v2.11 as single "File Management Evolution" post?)

4. **Visual asset timeline** — Which 5-8 versions should be prioritized for high-effort visuals (animations, custom diagrams) vs. screenshots?
