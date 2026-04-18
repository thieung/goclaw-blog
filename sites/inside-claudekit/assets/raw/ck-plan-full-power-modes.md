---
title: "Unlocking the full power of /ck:plan — from --fast to --hard and beyond"
series: "Inside ClaudeKit"
project: claudekit
status: approved
created: 2026-04-14
slug: ck-plan-full-power-modes
---

# Unlocking the full power of /ck:plan — from --fast to --hard and beyond

## The planning problem most people don't notice

Most developers using ClaudeKit run `/ck:plan` the same way every time. They type a task, hit enter, get a plan, start coding. No flags. No mode selection. Just the default.

The default works. But it's the middle ground — not the fastest path, not the most thorough path. If you're planning a one-file config change, you're spending more time than you need to. If you're architecting a new authentication system, you're leaving critical research and adversarial review on the table.

`/ck:plan` has five distinct workflow modes. Most users have seen one of them. This post covers all five, when to use each, and the two underused features that make `--hard` mode genuinely powerful: red team review and cross-plan dependency detection.

---

## The five modes at a glance

| Flag | Mode | Research | Red Team | Validation | Best for |
|------|------|----------|----------|------------|----------|
| `--fast` | Fast | Skip | Skip | Skip | Simple tasks, clear scope |
| `--auto` | Auto-detect | Follows detection | Follows detection | Follows detection | Most tasks |
| `--hard` | Hard | 2 parallel researchers | Yes (2-4 reviewers) | Config-driven | Complex features, unknown domain |
| `--parallel` | Parallel | 2 parallel researchers | Yes (2-4 reviewers) | Config-driven | 3+ independent layers/modules |
| `--two` | Two approaches | 2+ researchers | After selection | After selection | Ambiguous approach, multiple valid paths |

> **Note on Validation:** The Validation column shows "Config-driven" because validation behavior depends on your `Validation:` setting in plan context (injected by hooks): `prompt` asks before running, `auto` always runs, `off` skips entirely. This is user configuration, not mode behavior.

The default when no flag is specified is `--auto` — the skill analyzes your task and picks the mode. But knowing when to override auto-detection is where the real leverage lives.

---

## --fast: skip everything, get to code

```
/ck:plan "add timeout config to the HTTP client" --fast
```

`--fast` skips research, skips the scope challenge, skips red team, skips validation. It goes straight from your task description to a plan.

The cook command it produces is:
```
/ck:cook --auto {path}/plan.md
```

The `--auto` cook flag pairs intentionally with `--fast` planning — you're signaling that you want speed over gates. Both planning and execution skip review stops.

**When to use it:**
- Single-file fixes
- Config changes
- You already understand the problem deeply
- You said "just plan it" and you meant it

**When to avoid it:**
- Unfamiliar codebases
- New technical domains
- Anything touching auth, payments, or core data models

---

## --hard: the full research pipeline

```
/ck:plan "implement refresh token rotation with Redis backing" --hard
```

`--hard` is the mode most people think they don't need until they do. It spawns two researcher agents in parallel — each investigating different aspects of the problem — then synthesizes findings into a plan before any design decisions are made.

The sequence:
1. Spawn 2 researcher agents (max 5 tool calls each, different aspects)
2. Read codebase docs; run `/ck:scout` if they're stale or missing
3. Pass research + scout report to `planner` subagent
4. Red team review — hostile reviewers attack the plan
5. Validation interview — critical questions confirm the final plan (runs based on your `Validation:` plan context config: `prompt` asks, `auto` always runs, `off` skips)
6. Hydrate tasks with sequential dependency chain

The cook command it produces:
```
/ck:cook {path}/plan.md
```

No `--auto` flag. The thorough planning needs interactive review gates during execution.

**When to use it:**
- Anything touching security, auth, or payments
- Unfamiliar technology (new library, new platform, new paradigm)
- Features that affect multiple teams or codebases
- You've been burned by "simple" tasks before

---

## --parallel: file ownership for concurrent execution

```
/ck:plan "build user dashboard with API layer, React components, and Postgres schema" --parallel
```

`--parallel` builds on `--hard` but adds an explicit file ownership matrix and dependency graph to the plan. The output is designed for multi-agent concurrent execution.

What it adds to the plan:
- **Exclusive file ownership** per phase — no overlap between phases
- **Dependency matrix** — which phases can run concurrently vs which must be sequential
- **Conflict prevention** strategy — how to merge without collisions

The cook command:
```
/ck:cook --parallel {path}/plan.md
```

The task hydration uses `addBlockedBy` for sequential deps and no blockers for parallel groups. `/ck:cook --parallel` picks this up and spawns agents accordingly.

**When to use it:**
- 3+ independent features or architectural layers
- DB schema + API + UI that don't share files
- You want to parallelize work in a single session

**Constraint:** Each phase must be self-contained. If Phase 2 needs an output from Phase 1, they can't be parallel. The planner is designed to detect this and assign sequential ordering — but this is a design responsibility, not a hard enforcement gate. Always verify the file ownership matrix before running parallel execution.

---

## --two: compare approaches before committing

```
/ck:plan "add real-time notifications — websockets vs SSE" --two
```

`--two` generates two distinct implementation approaches with explicit trade-off analysis. You review both approaches, pick one, then the red team and validation phases run on your selection — not on a plan you didn't choose.

The sequence:
1. Same research phase as `--hard`
2. Planner creates 2 approaches: pros, cons, recommended path with rationale
3. You select an approach
4. Red team attacks the selected approach
5. Validation confirms the selected approach
6. Task hydration for the selected approach only

**When to use it:**
- Genuinely ambiguous design decisions
- Two valid technical paths with real trade-offs (e.g., client-side vs server-side rendering, event sourcing vs CRUD)
- You want to see the comparison written out before committing

**When to avoid it:** Don't use `--two` if you already know which approach you want. It doubles the planning work. Use `--hard` and describe your preferred approach in the task.

---

## Scope Challenge: the gate before the mode

Every mode except `--fast` runs Step 0 first: the Scope Challenge — unless the task is clearly trivial (single-file fix, typo, config change) or under 20 words and unambiguous. It's three questions asked before any research begins.

**Question 1: What already exists?**
Scans the codebase for code that partially solves sub-problems. If you're about to build an HTTP retry mechanism and one already exists in `src/utils/retry.ts`, that changes the plan.

**Question 2: What is the minimum change set?**
Forces explicit identification of deferrable work. Nice-to-haves disguised as requirements get flagged here.

**Question 3: Complexity check**
If the planned work would touch more than 8 files, introduce more than 2 new classes/services, or span more than 3 phases — you get challenged. Not blocked, challenged. You can proceed.

After the three questions, you choose one of three scope modes:

| Selection | Effect | Mode Suggestion |
|-----------|--------|-----------------|
| **EXPANSION** | Research explores alternatives and adjacent features; stretch items labeled in plan | Suggests `--hard` for thorough research |
| **HOLD** | Respect scope exactly; focus on failure modes and edge cases | No mode change |
| **REDUCTION** | Strip to minimum; defer non-critical work | Suggests `--fast` to skip overhead |

The scope mode selection integrates with planning mode suggestions. If you select EXPANSION, the skill may recommend switching to `--hard` if you started with `--auto`. If you select REDUCTION, it may suggest `--fast` to skip remaining gates.

The critical rule: once you pick a scope mode, the planner commits to it. It won't silently shrink scope when you chose HOLD, won't add stretch items when you chose REDUCTION. Scope concerns are raised once in Step 0, then closed.

---

## Red team review: hostile reviewers before code

Red team runs in `--hard`, `--parallel`, and `--two` modes. It runs **after** planning and **before** validation. The ordering matters.

Red team spawns 2-4 adversarial reviewers depending on plan complexity (more phases = more reviewers). Each reviewer has a named lens:

- **Security Adversary** — attacks auth, data exposure, injection vectors
- **Failure Mode Analyst** — finds crash paths, race conditions, unhandled errors
- **Assumption Destroyer** — challenges "obvious" requirements that may not hold
- **Scope & Complexity Critic** — flags overengineering and scope creep

Red team findings are added directly to `plan.md` as a `## Red Team Review` section, and individual phase files get inline edits with risk annotations.

**Important:** Red team changes require your approval before being applied. You'll see proposed edits and can accept, reject, or modify them. This is interactive, not automatic.

The invocation internally:
```
/ck:plan red-team {plan-directory-path}
```

You can also run it standalone on any existing plan:
```
/ck:plan red-team ./plans/260414-auth-system/
```

---

## Cross-plan dependency detection

Every time `/ck:plan` creates a new plan, it scans all unfinished plans in `./plans/` first. If it finds overlapping scope, it classifies the relationship and updates both plan files bidirectionally.

Three relationship types:
- **blockedBy** — this new plan needs output from an existing plan
- **blocks** — this new plan changes something an existing plan depends on
- **mutual** — both plans reference each other

Example frontmatter after detection:
```yaml
blockedBy: [260301-1200-auth-system]     # This plan waits on auth-system
blocks: [260228-0900-user-dashboard]     # This plan blocks user-dashboard
```

When any blocker is not `completed`, the blocked plan's status is noted as blocked on the next scan. When all blockers complete, it automatically becomes unblocked.

This is easy to overlook because it's silent by default. But on a codebase with multiple active plans, it prevents two plans from independently modifying the same file and producing a merge conflict during implementation.

---

## The cook handoff: absolute paths matter

After plan creation, every mode outputs a cook command with an absolute path:

```
/ck:cook {absolute-plan-path}/plan.md
```

The reason for absolute paths: the standard workflow is to run `/clear` before implementing, which drops all planning context from the session. A relative path like `./plans/my-plan/plan.md` would require you to remember where you were. The absolute path survives `/clear`.

This is explicitly marked as non-negotiable in the skill — it always outputs after presenting the plan, regardless of mode.

---

## Choosing the right mode

The practical decision tree:

```
Task description under 20 words, single file, trivial?
  → --fast

Unfamiliar domain, security-sensitive, or complex?
  → --hard

3+ independent modules that could be built concurrently?
  → --parallel

Two genuinely valid approaches with real trade-offs?
  → --two

Not sure?
  → --auto (and trust the detection)
```

Auto-detection signals:
- Simple task, clear scope, no unknowns → fast mode
- Complex task, unfamiliar domain, new tech → hard mode
- 3+ independent features/layers/modules → parallel mode
- Ambiguous approach, multiple valid paths → two mode

---

## A few more things worth knowing

**`--no-tasks`** works with every mode. Add it to skip task hydration entirely — useful when you want the plan files without creating Claude Tasks. Example: `/ck:plan "refactor auth" --hard --no-tasks`.

**Red team and validate are also standalone subcommands.** You can run them against any existing plan directory:
```
/ck:plan red-team ./plans/260414-auth-system/
/ck:plan validate ./plans/260414-auth-system/
```
Useful when you've written a plan manually or want to re-run review after making edits.

**Upcoming in `/ck:cook`:** A `--tdd` flag is in the adoption roadmap that will enforce RED-GREEN-REFACTOR per implementation task — no production code before a failing test. This is a cook-side execution mode, not a planning mode. Watch the releases.

---

## Use Cases and Sample Prompts

### --fast: Quick config and single-file changes

**Add environment variable:**
```
/ck:plan "add REDIS_URL to .env.example and update config loader" --fast
```

**Fix a bug you already understand:**
```
/ck:plan "fix race condition in useAuth hook — add cleanup on unmount" --fast
```

**Rename a function across files:**
```
/ck:plan "rename getUserById to findUserById across all services" --fast
```

### --hard: Security, auth, and unfamiliar domains

**Implement authentication:**
```
/ck:plan "implement JWT refresh token rotation with Redis session storage" --hard
```

**Add payment integration:**
```
/ck:plan "integrate Stripe subscriptions with webhook handling and idempotency" --hard
```

**New technology adoption:**
```
/ck:plan "migrate state management from Redux to Zustand" --hard
```

**Multi-tenant data isolation:**
```
/ck:plan "add row-level security for multi-tenant Postgres schema" --hard
```

### --parallel: Independent layers that can build concurrently

**Full-stack feature:**
```
/ck:plan "build user settings page: Postgres schema, API endpoints, React UI" --parallel
```

**Microservice addition:**
```
/ck:plan "add notification service: message queue consumer, email templates, delivery tracking" --parallel
```

**Multi-platform feature:**
```
/ck:plan "implement push notifications: iOS APNs, Android FCM, web service worker" --parallel
```

### --two: Genuine trade-off decisions

**Architecture decision:**
```
/ck:plan "real-time updates: compare WebSocket vs Server-Sent Events for dashboard" --two
```

**Storage strategy:**
```
/ck:plan "file uploads: compare S3 direct upload vs server proxy approach" --two
```

**State management:**
```
/ck:plan "form handling: compare React Hook Form vs Formik for complex wizard flow" --two
```

### --auto: When you're not sure

**Let the skill decide:**
```
/ck:plan "add dark mode toggle with system preference detection"
```

**Mixed complexity:**
```
/ck:plan "refactor the checkout flow to support guest checkout"
```

---

## Real-World Workflow Examples

### Workflow 1: New feature end-to-end

**Context:** Adding a comments system to a blog platform.

| Step | Action | Command |
|------|--------|---------|
| 1 | Plan with research | `/ck:plan "add comments system with threading and moderation" --hard` |
| 2 | Approve red team edits | Interactive — accept/reject proposed changes to `plan.md` |
| 3 | Answer validation questions | Interactive prompts (if validation config is `prompt` or `auto`) |
| 4 | Implement | `/ck:cook {path}/plan.md` |
| 5 | Review code | `/ck:code-review` |

**Why --hard:** Comments touch user-generated content, moderation logic, and potentially spam prevention — areas where missing edge cases cost real time later.

### Workflow 2: Rapid bug fix

**Context:** Production bug — users can't reset passwords.

| Step | Action | Command |
|------|--------|---------|
| 1 | Quick plan | `/ck:plan "fix password reset: token expiry check uses wrong timezone" --fast` |
| 2 | Implement immediately | `/ck:cook --auto {path}/plan.md` |
| 3 | Test and deploy | Your normal deploy process (git push, CI/CD, etc.) |

**Why --fast:** You already diagnosed the bug. Research and red team would delay a production fix for no benefit.

### Workflow 3: Architecture decision

**Context:** Choosing between two valid approaches for a caching layer.

| Step | Action | Command |
|------|--------|---------|
| 1 | Generate two approaches | `/ck:plan "add API response caching: Redis vs in-memory LRU" --two` |
| 2 | Review trade-off analysis | Read both approach sections in plan |
| 3 | Select approach | Answer selection prompt |
| 4 | Approve red team edits | Interactive — accept/reject proposed changes |
| 5 | Validate selected approach | Interactive prompts (config-dependent) |
| 6 | Implement | `/ck:cook {path}/plan.md` |

**Why --two:** Both Redis and LRU are valid. The trade-offs (infrastructure cost vs cold-start latency) depend on your specific constraints. Seeing them side-by-side in writing helps.

### Workflow 4: Parallel development sprint

**Context:** Building a dashboard with independent layers.

| Step | Action | Command |
|------|--------|---------|
| 1 | Plan with parallelization | `/ck:plan "analytics dashboard: Postgres aggregations, API layer, React charts" --parallel` |
| 2 | Review file ownership matrix | Verify no overlap between phases |
| 3 | Implement concurrently | `/ck:cook --parallel {path}/plan.md` |
| 4 | Merge and test | Automatic conflict prevention |

**Why --parallel:** Schema, API, and UI don't share files. Three agents can work simultaneously without merge conflicts.

### Workflow 5: Unfamiliar codebase onboarding

**Context:** First feature in a codebase you didn't write.

| Step | Action | Command |
|------|--------|---------|
| 1 | Scout the codebase first | `/ck:scout` |
| 2 | Plan with full research | `/ck:plan "add user preferences API endpoint" --hard` |
| 3 | Review researcher findings | Check what patterns already exist |
| 4 | Approve red team edits | Interactive — review assumption challenges |
| 5 | Implement with confidence | `/ck:cook {path}/plan.md` |

**Why --hard:** You don't know what exists. The researcher agents find existing patterns, utilities, and conventions before you accidentally duplicate them.

### Workflow 6: Re-validating an edited plan

**Context:** You manually edited a plan file and want to re-run review.

| Step | Action | Command |
|------|--------|---------|
| 1 | Edit plan manually | vim/VSCode |
| 2 | Re-run red team | `/ck:plan red-team ./plans/260414-auth-system/` |
| 3 | Re-run validation | `/ck:plan validate ./plans/260414-auth-system/` |
| 4 | Implement | `/ck:cook ./plans/260414-auth-system/plan.md` |

**Why standalone subcommands:** Red team and validate work on any plan directory — not just freshly created ones.

---

## Best Practices

### 1. Match mode to risk, not complexity

Complexity alone doesn't dictate mode. A complex refactor you understand deeply might be `--fast`. A simple auth change you've never done might be `--hard`.

```
❌ "This is a big feature" → --hard
✅ "This touches auth and I'm not sure about token rotation" → --hard
```

### 2. Write specific task descriptions

The skill's auto-detection works better with specific descriptions. Vague tasks get conservative (slow) mode selection.

```
❌ "improve the login flow"
✅ "add rate limiting to login endpoint: 5 attempts per 15 minutes per IP, Redis counter"
```

### 3. Use --fast more often than you think

Most daily tasks are `--fast` candidates: config changes, bug fixes you understand, refactors with clear scope. Save the heavy modes for genuinely uncertain work.

```
✅ /ck:plan "update TypeScript to 5.4, fix type errors" --fast
✅ /ck:plan "add loading spinner to submit button" --fast
✅ /ck:plan "fix N+1 query in getUserPosts" --fast
```

### 4. Don't skip scope challenge on complex work

When the scope challenge asks if you want EXPANSION, HOLD, or REDUCTION — answer honestly. HOLD is usually right. EXPANSION adds scope creep. REDUCTION might defer critical work.

```
✅ Complex auth feature → HOLD (respect scope, focus on edge cases)
✅ Exploratory prototype → EXPANSION (discover adjacent needs)
✅ Urgent hotfix → REDUCTION (minimum viable fix)
```

### 5. Run red-team on manually written plans

If you wrote a plan outside ClaudeKit (or inherited one), run red-team before implementing:

```
/ck:plan red-team ./plans/my-manual-plan/
```

Hostile reviewers catch assumptions you didn't know you made.

### 6. Check cross-plan dependencies before starting

If you have multiple active plans in `./plans/`, the skill detects dependencies automatically. But you should still check:

```bash
grep -r "blockedBy\|blocks" ./plans/*/plan.md
```

Don't start a plan that's blocked by unfinished work.

### 7. Use --parallel only with true independence

`--parallel` fails if phases share files or runtime dependencies. Before using it, verify:
- No shared source files between phases
- No phase needs output from another phase
- Each phase can be tested independently

```
❌ API endpoint that depends on schema migration → sequential
✅ iOS push notifications + Android push notifications → parallel
```

### 8. Trust --auto for routine work

If you're not sure which mode to use and it's not security-critical, just run without a flag:

```
/ck:plan "add pagination to user list endpoint"
```

Auto-detection picks fast for simple tasks, hard for complex ones. Override only when you know better.

### 9. Always review red team findings

Red team findings are added to `{plan-dir}/plan.md` in the `## Red Team Review` section, with inline annotations in phase files. Don't skip reviewing them — they contain:
- Missing failure modes
- Overengineered phases flagged for removal
- Hidden assumptions that could break implementation

Remember: you must approve red team edits before they're applied. Take time to review each proposed change.

### 10. Use absolute paths in your notes

When documenting which plan you're implementing, use the absolute path the skill outputs:

```
✅ /ck:cook /Users/dev/project/plans/260414-0312-auth-system/plan.md
❌ /ck:cook ./plans/auth-system/plan.md
```

Absolute paths survive `/clear` and session restarts.

---

## Quick Reference Card

| Situation | Mode | Example |
|-----------|------|---------|
| Single-file fix, clear scope | `--fast` | Config change, typo fix, rename |
| Security, auth, payments | `--hard` | JWT rotation, Stripe webhooks, RBAC |
| Unfamiliar codebase/tech | `--hard` | First feature, new library adoption |
| 3+ independent modules | `--parallel` | Schema + API + UI, multi-platform |
| Two valid approaches | `--two` | WebSocket vs SSE, Redis vs LRU |
| Not sure | (no flag) | Let auto-detection decide |

| Subcommand | Purpose |
|------------|---------|
| `/ck:plan red-team {path}` | Run hostile review on existing plan |
| `/ck:plan validate {path}` | Run validation interview on existing plan |

---

## Summary

`/ck:plan` is five tools with one interface. The flag you pass changes what research gets done, whether hostile reviewers attack your plan before you build it, and whether your implementation can run concurrently across agents.

The default `--auto` covers most cases. But knowing when to explicitly reach for `--hard` (unknown domain, security-critical), `--parallel` (independent modules), or `--two` (genuinely ambiguous decision) is the difference between a plan that works and a plan that holds up.

The scope challenge, red team, and cross-plan dependency detection are the layers most users have never seen. They're not gated behind a premium tier or a config flag — they run automatically when you pick the right mode.

Pick the mode that matches the problem. The skill handles the rest.
