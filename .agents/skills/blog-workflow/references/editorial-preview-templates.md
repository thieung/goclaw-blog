# Editorial Preview Templates

Use these templates for `$thieung:blog --preview <slug>` when the user wants visual directions before Astro conversion. They are standalone HTML mockup templates for aesthetic selection, not production `.astro` drafts.

## Output Contract

- Gallery: `sites/inside-{project}/assets/previews/<slug>-editorial-gallery.html`
- Variants: `sites/inside-{project}/assets/previews/mockups/<slug>-preview-05-kami-parchment.html` and so on
- Source content: approved markdown in `assets/raw/<slug>.md`
- Keep article facts, order, headings, tables, code blocks, and inline code intact
- Do not create `.astro` or i18n files during preview selection

## Template Bank 05-10

| ID | Name | Best for | Visual signature | Avoid when |
|----|------|----------|------------------|------------|
| 05 | Kami Parchment | Long explainers, reflective technical essays, beginner-friendly guides, docs-like posts | Warm parchment, single serif voice, ink-blue accent, hairline rules | Needs high-energy product launch or incident tone |
| 06 | Guizang E-Ink | Deep internals, architecture, narrative technical magazines, "Inside" series | E-ink issue layout, oversized serif headline, paper/ink reversals, act-divider rhythm | Needs dense dashboards, KPIs, or strict factual grid |
| 07 | Swiss Grid | Methodology, checklists, comparison tables, release facts, process articles | 16-column rational grid, IKB blue, no radius, fact-first hierarchy | Needs warm human essay tone |
| 08 | Sunday Poster | Editorial magazine feel, opinionated explainers, broad audience articles | Newsprint poster, large serif headline, numbered cells, dot paper texture | Very long dense code-heavy articles |
| 09 | NYT Chart Ledger | Data-led posts, measured tradeoffs, timelines, evidence-heavy analysis | Newsroom/chart-led story, red annotations, source-heavy footnotes, inline SVG chart | No real data or chartable concept |
| 10 | Safety Dossier | Guard rails, security, privacy, incidents, risk, red-team, compliance | Hazard stripes, safety alert palette, dossier tone, tier cards | Calm guide or beginner onboarding |

## Topic Recommendation Rules

- `guard`, `safety`, `privacy`, `secret`, `risk`, `incident`, `red-team`, `security` -> recommend **10 Safety Dossier**; backup **06 Guizang E-Ink** if the tone should be more editorial than urgent.
- `inside`, `internals`, `hook`, `agent`, `workflow`, `architecture`, `system`, `harness` -> recommend **06 Guizang E-Ink**; backup **07 Swiss Grid** for stricter factual presentation.
- `data`, `metric`, `benchmark`, `timeline`, `trend`, `evidence`, `comparison`, `before-after` -> recommend **09 NYT Chart Ledger**; backup **07 Swiss Grid**.
- `guide`, `beginner`, `how-to`, `explainer`, `docs`, `concept`, `overview` -> recommend **05 Kami Parchment**; backup **08 Sunday Poster**.
- `opinion`, `editorial`, `magazine`, `manifesto`, `essay` -> recommend **08 Sunday Poster**; backup **06 Guizang E-Ink**.
- `release`, `version`, `changelog`, `feature`, `roadmap`, `methodology` -> recommend **07 Swiss Grid**; backup **08 Sunday Poster** if the article should feel more public-facing.

If multiple rules match, choose the recommendation that matches the article's first 500 characters and frontmatter `tags` most closely. Still generate the full requested batch unless the user explicitly asks for fewer variants.

## Required Sections Per Variant

Each generated template should include:

- Sticky or visible preview bar with project logo and "Gallery" link
- Hero/title area with article title, description, version/date metadata
- Short concept card explaining the template source and why it fits
- TOC for all article sections
- Article body preserving all markdown content
- Styled callouts for blockquotes, `.table-wrap` around tables, and code blocks
- Responsive layout for 390px mobile and 1440px desktop

## Verification

Before reporting done:

- Open the gallery from a local static server or direct file path
- Verify every variant returns/opens successfully
- Check desktop and mobile viewports for horizontal overflow
- Check logo natural size is non-zero
- Check section/table/code block counts match the markdown-derived output
- Inspect at least the recommended template screenshot by eye
