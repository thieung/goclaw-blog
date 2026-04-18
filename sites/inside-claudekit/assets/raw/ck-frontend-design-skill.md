---
title: "Understanding and using /ck:frontend-design effectively"
series: "Inside ClaudeKit"
project: claudekit
status: approved
created: 2026-04-14
slug: ck-frontend-design-skill
---

# Understanding and using /ck:frontend-design effectively

## The problem with AI-generated UI

If you've used Claude, GPT, or any LLM to generate a UI component in the last two years, you've probably seen the same output: Inter font, purple-to-blue gradient, three equal-width cards in a row, a centered hero with "Elevate your workflow" written in bold white text.

That's AI slop. It's not wrong — it works, it compiles, it looks acceptable in a Figma mockup. But it's invisible. Every AI-generated UI looks the same because every LLM defaults to the same training distribution.

`/ck:frontend-design` was built to solve this. It's an opinionated skill that enforces distinctive design decisions, catches the most common LLM default patterns before they land in production, and provides a curated pattern library of premium UI techniques.

---

## What the skill does

At its core, `/ck:frontend-design` is a workflow guide with three responsibilities:

1. **Workflow routing** — Match the right process to your input (screenshot, video, 3D, from scratch)
2. **Design system enforcement** — Three configurable dials that drive aesthetic decisions
3. **Anti-slop rules** — An explicit blocklist of LLM default patterns with alternatives

The skill always activates `ck:ui-ux-pro-max` first — this is a companion skill that runs internal Python scripts to research design trends, typography combinations, color theory, and industry patterns. It feeds intelligence into the design decisions before any code is written. You don't invoke it manually; the skill triggers it automatically.

---

## Workflow selection

The first decision the skill makes is which workflow to use:

| Input | Workflow | Use case |
|-------|----------|----------|
| Screenshot | Replicate exactly | Match a design spec pixel-perfect |
| Video | Replicate with animations | Capture interactions from a recording |
| Screenshot/Video (describe only) | Document for devs | Handoff notes without code |
| 3D/WebGL request | Three.js immersive | Particle systems, interactive 3D scenes |
| Quick task | Rapid implementation | Components, MVPs, single-page designs |
| Complex/award-quality | Full immersive | Storytelling, scroll experiences, Awwwards-level |
| Existing project upgrade | Redesign Audit | Audit and improve an existing UI systematically |
| From scratch | Design Thinking | Start from purpose, not template |

For most use cases in a blog or documentation context, the **from scratch** path is most common. This triggers the Design Thinking process before any code is written.

---

## Design Thinking: committing to a direction

Before writing a single line of CSS, the skill requires you to commit to a **bold aesthetic direction**. This is deliberate — most AI-generated UI fails because it starts with code, not a concept.

The four questions to answer first:

- **Purpose** — What problem does this interface solve? Who uses it?
- **Tone** — Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian...
- **Constraints** — Framework, performance targets, accessibility requirements
- **Differentiation** — What's the one thing someone will remember about this design?

The skill doesn't accept "modern and clean" as a tone. That's the default. You need to commit to something specific.

**Example — vague vs committed:**
- Vague: "Modern and clean with good typography" — could describe any LLM output
- Committed: "Industrial utilitarian — monospace everything, 1px borders, 8px grid, like a terminal that learned CSS" — now the skill has a direction to execute with precision

---

## The three design dials

Once you have a direction, three configurable parameters drive all subsequent decisions:

### DESIGN_VARIANCE (default: 8)
Controls how much asymmetry is acceptable.

- **Low (1-3):** Perfect symmetry, centered layouts, equal grids
- **High (8-10):** Asymmetric grids, massive empty zones, fractional CSS Grid, elements that break the grid intentionally

At `DESIGN_VARIANCE > 4`, centered heroes are overused — the skill forces split-screen or left-aligned layouts instead.

### MOTION_INTENSITY (default: 6)
Controls animation complexity.

- **Low (1-3):** CSS hover/active states only
- **High (8-10):** Framer Motion scroll reveals, spring physics, perpetual micro-animations

At `MOTION_INTENSITY > 5`, the skill embeds perpetual micro-animations. The Bento Motion Engine (for SaaS dashboards) requires all cards to have active states that loop infinitely.

### VISUAL_DENSITY (default: 4)
Controls information density.

- **Low (1-3):** Art gallery — huge whitespace, expensive/clean
- **High (7-10):** Cockpit — tiny paddings, 1px dividers, monospace numbers everywhere

At `VISUAL_DENSITY > 7`, generic cards with border+shadow are replaced with spacing and dividers.

---

## Anti-slop rules: the blocklist

The skill maintains an explicit list of LLM defaults to avoid. The philosophy: these aren't absolute bans — they're "overused AI defaults." Context matters. A SaaS dashboard and a personal blog have different rules. If you have a legitimate reason (existing design system, client requirement), override the defaults explicitly.

### Typography
Avoid by default: `Inter`, `Roboto`, `Arial`, `Open Sans`, `Space Grotesk`

Prefer: `Geist`, `Outfit`, `Cabinet Grotesk`, `Satoshi`, `Plus Jakarta Sans` — or any variable font with character.

Always use font size larger than 16px on input fields (prevents iOS Safari zoom).

### Color
Avoid by default: AI purple/blue gradient, pure `#000000`, oversaturated accents (saturation > 80%)

Rules:
- Max 1 accent color per project
- Stick to one gray family — never mix warm and cool grays
- Tint shadows to match background hue
- Add subtle noise/grain to avoid sterile flat design

### Layout
Avoid by default: 3-column equal card layouts, `h-screen` (use `min-h-[100dvh]` for iOS Safari), centered hero at high variance

Rules:
- Break symmetry with offset margins or mixed aspect ratios
- Use CSS Grid over complex flexbox `calc()` math
- Always constrain content to ~1200-1440px with auto margins

### Content (the "Jane Doe" effect)
Avoid by default: "John Doe", "Acme Corp", round numbers (50%, $100), startup slop ("Nexus", "SmartFlow"), AI copy clichés ("Elevate", "Seamless", "Unleash", "Game-changer", "Tapestry", "Delve")

Use: realistic names, organic data (47.2%, $99.00), plain specific language, sentence case headers

### Visual effects
Avoid by default: neon/outer glows, custom cursors, standard `ease-in-out`/`linear` transitions

Prefer: tinted inner shadows, spring physics, custom cubic-beziers

### The quick self-check
Before shipping any design, scan for these giveaways:
- [ ] Inter font anywhere?
- [ ] Purple or blue gradient as the main aesthetic?
- [ ] Three equal-width cards in a row?
- [ ] Centered hero over a dark gradient image?
- [ ] "John Doe" or "Acme Corp" anywhere?
- [ ] Round placeholder numbers (50%, $100)?
- [ ] "Elevate your workflow" or similar copy?
- [ ] Pure `#000000` as background?

---

## Premium design patterns

The skill ships with a curated library of patterns pulled from Dribbble top shots, Awwwards winners, and Behance featured work.

### Vibe archetypes (pick one before designing)

**Ethereal Glass** (SaaS / AI / Tech)
Deep OLED black (`#050505`), radial mesh gradient orbs in background, vantablack cards with heavy `backdrop-blur`, wide geometric Grotesk typography.

**Editorial Luxury** (Lifestyle / Agency)
Warm creams (`#FDFBF7`), muted sage or deep espresso. Variable serif for massive headings, subtle CSS noise overlay for a physical paper feel.

**Soft Structuralism** (Consumer / Health / Portfolio)
Silver-grey or pure white background, massive bold Grotesk, airy floating components with highly diffused ambient shadows.

### Navigation patterns
- Mac Dock Magnification — nav icons scale fluidly on hover
- Magnetic Button — buttons pull toward the cursor using mouse tracking
- Dynamic Island — pill-shaped component that morphs to show status
- Fluid Island Nav — floating glass pill detached from top, hamburger → X on mobile

### Layout patterns
- Asymmetrical Bento — masonry-like CSS Grid with varying card sizes
- Z-Axis Cascade — elements stacked like physical cards with overlap and depth
- Editorial Split — massive typography left, scrollable content right
- Curtain Reveal — hero section parting in the middle on scroll

### Card patterns
- Double-Bezel (Doppelrand) — cards that look like machined hardware with outer shell + inner core
- Glassmorphism Panel — true frosted glass: `backdrop-blur` + 1px inner border + inner shadow
- Spotlight Border Card — borders that illuminate dynamically under the cursor

### Typography patterns
- Text Scramble Effect — Matrix-style character decoding on load or hover
- Kinetic Marquee — endless text bands that reverse direction on scroll
- Variable Font Animation — interpolate weight/width on scroll for text that feels alive

---

## Bento Motion Engine (for SaaS dashboards)

When building feature sections or SaaS dashboards, the skill activates the Bento Motion Engine — a specialized architecture for making dashboards feel alive.

Key principles:
- All major containers use `rounded-[2.5rem]`
- Diffusion shadow: `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]` — depth without clutter
- Every card must contain a perpetual micro-interaction: Pulse, Typewriter, Float, or Carousel
- Card titles and descriptions sit **outside and below** the card (gallery-style)

Double-Bezel structure for premium cards (Tailwind):
```html
<!-- Outer shell -->
<div class="bg-black/5 ring-1 ring-black/5 p-1.5 rounded-[2rem]">
  <!-- Inner core -->
  <div class="shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2rem-0.375rem)]">
    <!-- card content -->
  </div>
</div>
```

Or in plain CSS:
```css
.card-outer {
  background: rgba(0,0,0,0.05);
  outline: 1px solid rgba(0,0,0,0.05);
  padding: 6px;
  border-radius: 2rem;
}
.card-inner {
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.15);
  border-radius: calc(2rem - 0.375rem);
}
```

Spring physics for all interactive elements:
```js
{ type: "spring", stiffness: 100, damping: 20 }
```

Performance requirement: every perpetual animation must be isolated to prevent parent re-renders. In React, wrap in `React.memo` and extract as a leaf `'use client'` component. In Vue, use `v-once` or extract to a separate component. In vanilla JS/HTML, keep animated elements out of any parent that re-renders on state changes.

---

## Performance guardrails

The skill enforces strict performance rules to prevent mobile frame drops.

### GPU-safe animations
Only animate: `transform` (translate, scale, rotate) and `opacity`

Never animate: `top`, `left`, `right`, `bottom`, `width`, `height`, `margin`, `padding` — these trigger layout reflow on every frame.

```css
/* Good — GPU composited */
.card { transform: translateY(0); transition: transform 300ms; }
.card:hover { transform: translateY(-4px); }

/* Bad — layout reflow every frame */
.card { top: 0; transition: top 300ms; }
.card:hover { top: -4px; }
```

### Blur constraints
Apply `backdrop-blur` only to fixed-position elements (sticky navbars, modals). Never apply to scrolling containers or large content areas — this causes severe frame drops on mid-range mobile.

### Grain overlays
Implement grain as a CSS pseudoelement (`::after` with SVG filter), not repeated DOM elements. This keeps the effect GPU-composited and avoids layout pollution.

---

## Anime.js v4 integration

The skill uses Anime.js when vanilla CSS transitions are insufficient and the project doesn't already use Framer Motion or GSAP. When it does, it enforces v4 syntax:

```js
// Correct v4 import
import { animate, createTimeline, stagger, utils, svg, eases, engine } from 'animejs';

// Set ONCE in app entry point only
engine.timeUnit = 's';

// Simple animations: single-line format
animate('.element', { x: 250, duration: 1, ease: 'outQuad' });
```

Never use v3 syntax (`import anime from 'animejs'`, `anime()`, `anime.timeline()`).

---

## Practical workflow example

Here's a typical session using `/ck:frontend-design` from scratch:

**1. Activate the skill**
```
/ck:frontend-design
```

**2. Specify intent with dial values**
```
Build a feature showcase section for a developer tool.
DESIGN_VARIANCE=9, MOTION_INTENSITY=7, VISUAL_DENSITY=5
```

**3. The skill runs Design Thinking**
- Commits to vibe: Ethereal Glass (deep OLED, radial orbs, Geist font)
- Differentiator: asymmetric bento grid where cells have spring-physics hover states and staggered scroll reveals
- Constraint: React project (Framer Motion available)

**4. Implementation**
- Activates `ck:ui-ux-pro-max` for design intelligence
- Builds step-by-step from research
- Runs anti-slop self-check before delivery

**5. Output**
Production-grade component (React/Vue/Astro/HTML depending on project) with:
- Unique font pairing (not Inter)
- Single accent color, tinted off-black background
- Asymmetric CSS Grid layout
- Spring-physics hover interactions (MOTION_INTENSITY=7 → Framer Motion)
- `min-h-[100dvh]` not `h-screen`

> For a zero-JS constraint, set `MOTION_INTENSITY=3` — the skill switches to CSS `@keyframes` and `:hover` transitions only.

---

## When to use /ck:frontend-design

Use it when:
- Building any UI from scratch in a ClaudeKit session
- Replicating a screenshot or video design to code
- Creating blog post visuals, landing pages, or component libraries
- You've gotten generic AI UI and want something that doesn't look like every other LLM output

Skip it when:
- You're making backend logic changes with no UI surface
- You're doing quick data transformations or utility scripts
- The design system is already locked and you're just filling in content

---

## Use Cases and Sample Prompts

### Landing page from scratch

**Prompt:**
```
/ck:frontend-design

Build a landing page for a CLI tool that generates documentation from code comments.

Target audience: developers who hate writing docs
Tone: industrial utilitarian — feels like a terminal but prettier
DESIGN_VARIANCE=8, MOTION_INTENSITY=5, VISUAL_DENSITY=6

Sections needed:
- Hero with live demo animation
- 3 key features (async, multi-language, zero-config)
- Code comparison (before/after)
- Install command with copy button
```

### Replicate a screenshot

**Prompt:**
```
/ck:frontend-design

Replicate this screenshot exactly: [paste image or path]

Framework: React + Tailwind
Match colors, spacing, and typography pixel-perfect
Preserve all interactions visible in the design
```

### SaaS dashboard feature section

**Prompt:**
```
/ck:frontend-design

Build a bento-style feature grid for a project management SaaS.

Use Bento Motion Engine — every card needs a perpetual micro-animation
DESIGN_VARIANCE=7, MOTION_INTENSITY=8, VISUAL_DENSITY=5
Vibe: Ethereal Glass

Features to showcase:
- Real-time collaboration (show cursors moving)
- AI task suggestions (typewriter effect)
- Calendar integration (animated date picker)
- Time tracking (pulsing timer)
```

### Redesign existing UI

**Prompt:**
```
/ck:frontend-design

Audit and redesign this pricing page: [paste code or screenshot]

Problems I see:
- Looks like every other SaaS pricing page
- Purple gradient feels generic
- Cards are all equal width

Keep the information architecture, change the visual execution
DESIGN_VARIANCE=9, MOTION_INTENSITY=4, VISUAL_DENSITY=4
```

### Blog post visual (custom HTML)

**Prompt:**
```
/ck:frontend-design

Create a standalone HTML page that visualizes the concept of "recursive CTEs in PostgreSQL"

Style: Editorial Luxury — warm creams, variable serif headings
Include an animated diagram showing query execution flow
No external dependencies — inline everything
DESIGN_VARIANCE=6, MOTION_INTENSITY=6, VISUAL_DENSITY=3
```

---

## Real-World Workflow Examples

### Workflow 1: New feature with UI

**Context:** Adding a settings panel to an existing React app.

| Step | Action | Tool/Skill |
|------|--------|------------|
| 1 | Plan the feature | `/ck:plan --mode default` |
| 2 | Implement backend logic | Claude Code (direct) |
| 3 | Design the settings UI | **`/ck:frontend-design`** |
| 4 | Integrate and test | `/ck:cook` |
| 5 | Review code quality | `/ck:code-review` |

**Step 3 prompt:**
```
/ck:frontend-design

Build a settings panel component for a React app.

Existing design system: Tailwind, Geist font, zinc color palette
Match the existing app aesthetic — don't introduce new colors

Sections:
- Profile settings (avatar upload, name, email)
- Notification preferences (toggles)
- API keys (masked display, copy button, regenerate)
- Danger zone (delete account with confirmation)

DESIGN_VARIANCE=4, MOTION_INTENSITY=3, VISUAL_DENSITY=5
```

### Workflow 2: Marketing site from Figma

**Context:** Converting a Figma design to production code.

| Step | Action | Tool/Skill |
|------|--------|------------|
| 1 | Export Figma frames as screenshots | Figma |
| 2 | Replicate hero section | **`/ck:frontend-design`** (screenshot mode) |
| 3 | Replicate features section | **`/ck:frontend-design`** (screenshot mode) |
| 4 | Replicate footer | **`/ck:frontend-design`** (screenshot mode) |
| 5 | Add animations and interactions | **`/ck:frontend-design`** (enhance mode) |
| 6 | Optimize for mobile | Claude Code (direct) |

**Step 2 prompt:**
```
/ck:frontend-design

Replicate this Figma export: [hero-section.png]

Framework: Astro + Tailwind
Match exactly — this is from an approved design
Extract colors and spacing from the image
```

**Step 5 prompt:**
```
/ck:frontend-design

Add scroll-triggered animations to this marketing page: [paste current code]

MOTION_INTENSITY=7
- Hero text: staggered fade-in from bottom
- Feature cards: reveal on scroll with spring physics
- Stats section: count-up animation on viewport entry
- Keep all existing styles intact
```

### Workflow 3: Blog post with custom visuals

**Context:** Writing a technical blog post that needs interactive diagrams.

| Step | Action | Tool/Skill |
|------|--------|------------|
| 1 | Write markdown draft | Claude Code (direct) |
| 2 | Create interactive diagram | **`/ck:frontend-design`** |
| 3 | Create code playground | **`/ck:frontend-design`** |
| 4 | Review and fact-check | `/thieung:blog --review` |
| 5 | Generate social thumbnails | `/thieung:blog --social` |

**Step 2 prompt:**
```
/ck:frontend-design

Create an interactive diagram showing how WebSocket connections work.

Style: matches my blog (dark mode, monospace accents, zinc palette)
Animation: show message flow between client and server
Include: connection handshake, bidirectional messages, close sequence
Output: standalone HTML that I can embed in an Astro page
DESIGN_VARIANCE=5, MOTION_INTENSITY=6, VISUAL_DENSITY=4
```

### Workflow 4: Rapid prototyping

**Context:** Quick MVP for a hackathon demo.

| Step | Action | Tool/Skill |
|------|--------|------------|
| 1 | Describe the idea | User prompt |
| 2 | Generate full UI | **`/ck:frontend-design`** (rapid mode) |
| 3 | Add backend integration | Claude Code (direct) |
| 4 | Deploy | `/ck:deploy` |

**Step 2 prompt:**
```
/ck:frontend-design

Quick task: Build an MVP for a "AI code review bot" landing page.

Time constraint: this is a hackathon demo, prioritize speed
Include: hero, feature list, waitlist signup form, footer
Framework: plain HTML + Tailwind CDN (no build step)
DESIGN_VARIANCE=6, MOTION_INTENSITY=4, VISUAL_DENSITY=4
```

---

## Best Practices

### 1. Always specify the dials explicitly

Don't rely on defaults. State your DESIGN_VARIANCE, MOTION_INTENSITY, and VISUAL_DENSITY values upfront.

```
❌ "Build a landing page"
✅ "Build a landing page. DESIGN_VARIANCE=8, MOTION_INTENSITY=6, VISUAL_DENSITY=4"
```

### 2. Commit to a vibe before asking for code

The skill works best when you've already decided on an aesthetic direction. Vague requests produce generic output.

```
❌ "Make it look modern and clean"
✅ "Vibe: Soft Structuralism — silver-grey background, massive Grotesk headings, airy floating cards"
```

### 3. Provide existing context when extending a project

If you're adding to an existing codebase, share the relevant constraints.

```
✅ "Existing design system: Tailwind, Geist font, zinc-900 backgrounds, emerald-500 accent"
✅ "Match the style of this existing component: [paste code]"
```

### 4. Use screenshot mode for pixel-perfect replication

When you have a design spec, use the replicate workflow. Don't ask the skill to "interpret" a design — ask it to match exactly.

```
❌ "Create something inspired by this screenshot"
✅ "Replicate this screenshot exactly: [image]"
```

### 5. Separate design from logic

Don't mix UI generation with business logic implementation in the same prompt. Use `/ck:frontend-design` for visuals, then integrate logic separately.

```
❌ "Build a settings page that also handles API calls and state management"
✅ "Build the settings page UI" → then separately: "Add the API integration to this component"
```

### 6. Run the anti-slop check before shipping

After generation, manually verify the checklist:
- No Inter/Roboto fonts?
- No purple-blue gradients?
- No "John Doe" or round numbers?
- No equal-width card layouts at high variance?

### 7. Adjust MOTION_INTENSITY for your deployment target

High motion looks great on desktop but can cause frame drops on mobile.

```
Desktop-first showcase: MOTION_INTENSITY=8
Mobile-first app: MOTION_INTENSITY=4
Zero-JS requirement: MOTION_INTENSITY=3 (CSS only)
```

### 8. Use Design Thinking for complex projects, skip it for components

- Full page or multi-section layout → run Design Thinking first
- Single component addition → skip to rapid implementation

```
Full page: "/ck:frontend-design → Build a pricing page from scratch"
Component: "/ck:frontend-design → Quick task: Add a toast notification component"
```

---

## Summary

`/ck:frontend-design` is the layer between "generate some UI" and "generate UI that looks like it was designed by a human who cares." Its value is in constraints, not capabilities — it's opinionated by design, refusing to let LLM defaults slip through.

The three dials (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY) give you precise control over aesthetic direction. The anti-slop checklist catches the fingerprints before they ship. The premium pattern library gives you the vocabulary to reach beyond the defaults.

The result: interfaces that don't all look the same.
