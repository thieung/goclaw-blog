const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const slug = 'guard-rails-in-claude-code-and-claudekit';
const previewDir = __dirname;
const mockupDir = path.join(previewDir, 'mockups');
const rawPath = path.join(previewDir, '..', 'raw', `${slug}.md`);
const galleryPath = path.join(previewDir, 'guard-rails-editorial-gallery.html');

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, markdown: source };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    let value = pair[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[pair[1]] = value;
  }
  return { meta, markdown: match[2].trim() };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderTokens(tokens) {
  let html = marked.parser(tokens);
  html = html
    .replace(/<blockquote>\n?/g, '<aside class="note">\n')
    .replace(/<\/blockquote>/g, '</aside>')
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_match, language, code) => {
      const label = language ? escapeHtml(language) : 'code';
      return `<figure class="code-block"><figcaption>${label}</figcaption><pre><code>${code}</code></pre></figure>`;
    });
  return html.trim();
}

function buildSections(markdown) {
  const tokens = marked.lexer(markdown);
  const firstHeading = tokens.find((token) => token.type === 'heading' && token.depth === 1);
  const bodyTokens = firstHeading ? tokens.slice(tokens.indexOf(firstHeading) + 1) : tokens;
  const introTokens = [];
  const sections = [];
  let current = null;

  for (const token of bodyTokens) {
    if (token.type === 'heading' && token.depth === 2) {
      if (current) sections.push(current);
      const match = token.text.match(/^Section\s+(\d+):\s*(.+)$/i);
      const number = match ? match[1].padStart(2, '0') : String(sections.length + 1).padStart(2, '0');
      const title = match ? match[2] : token.text;
      current = {
        id: slugify(title),
        label: `Section ${number}`,
        number,
        title,
        tokens: [],
      };
      continue;
    }
    if (current) current.tokens.push(token);
    else introTokens.push(token);
  }
  if (current) sections.push(current);

  return [
    {
      id: 'intro',
      label: 'Mo bai',
      number: '00',
      title: 'Vi sao guard rail can dung truoc tool call',
      displayTitle: 'Vì sao guard rail cần đứng trước tool call',
      tokens: introTokens,
      isIntro: true,
    },
    ...sections,
  ];
}

const source = fs.readFileSync(rawPath, 'utf8');
const { meta, markdown } = parseFrontmatter(source);
const sections = buildSections(markdown);
const counts = {
  sections: sections.length - 1,
  tables: (markdown.match(/\n\|/g) || []).length > 0 ? (marked.lexer(markdown).filter((token) => token.type === 'table').length) : 0,
  code: marked.lexer(markdown).filter((token) => token.type === 'code').length,
};

const title = meta.title || 'Guard rails hoạt động thế nào trong Claude Code và ClaudeKit';
const description = meta.description || '';
const version = meta.version || 'claudekit-engineer@2.19.1';
const created = meta.created || '2026-05-26';

function tocHtml() {
  return sections.map((section) => {
    const label = section.isIntro ? 'Mở bài' : section.label;
    return `<a href="#${section.id}"><span>${escapeHtml(label)}</span>${escapeHtml(section.displayTitle || section.title)}</a>`;
  }).join('\n');
}

function sectionsHtml() {
  return sections.map((section) => {
    const number = section.number;
    const label = section.isIntro ? 'Mở bài' : section.label;
    return `<section class="article-section${section.isIntro ? ' is-intro' : ''}" id="${section.id}">
  <div class="section-folio"><span>${escapeHtml(label)}</span><b>${escapeHtml(number)}</b></div>
  <h2>${escapeHtml(section.displayTitle || section.title)}</h2>
  ${renderTokens(section.tokens)}
</section>`;
  }).join('\n\n');
}

function baseCss() {
  return `
* { box-sizing: border-box; }
html { background: var(--bg); color: var(--fg); overflow-x: clip; scroll-behavior: smooth; }
body { margin: 0; min-height: 100dvh; background: var(--bg); color: var(--fg); font-family: var(--font-body); font-size: 17px; line-height: 1.68; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
a { color: inherit; text-decoration-color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 0.18em; }
a:hover { color: var(--accent); }
::selection { background: var(--accent); color: var(--on-accent); }
.preview-bar { position: sticky; top: 0; z-index: 50; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; min-height: 66px; padding: 10px max(18px, calc((100% - var(--max)) / 2)); border-bottom: 1px solid var(--rule-strong); background: var(--bar-bg); }
.brand { display: inline-flex; align-items: center; gap: 12px; min-width: 0; color: var(--fg); text-decoration: none; }
.brand img { width: 34px; height: 34px; object-fit: contain; flex: 0 0 auto; }
.brand span { min-width: 0; font: 700 13px/1.25 var(--font-mono); }
.actions { display: inline-flex; align-items: center; justify-content: end; gap: 8px; }
.action-btn { display: inline-flex; min-width: 44px; min-height: 44px; align-items: center; justify-content: center; border: 1px solid var(--rule-strong); background: var(--button-bg); color: var(--fg); border-radius: var(--radius); padding: 0 12px; font: 700 13px/1 var(--font-mono); cursor: pointer; text-decoration: none; }
.action-btn:hover { background: var(--accent-soft); border-color: var(--accent); }
.page { width: min(var(--max), calc(100% - 32px)); margin: 0 auto; padding: 42px 0 84px; }
.hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 390px); gap: 48px; align-items: end; min-height: 62dvh; padding: 44px 0 52px; border-bottom: 1px solid var(--rule-strong); }
.eyebrow, .kicker { margin: 0 0 14px; color: var(--accent); font: 700 13px/1.35 var(--font-mono); text-transform: uppercase; }
h1 { margin: 0; max-width: 900px; color: var(--headline); font-family: var(--font-display); font-size: 4.6rem; line-height: 1.03; font-weight: var(--display-weight); text-wrap: balance; }
.dek { max-width: 750px; margin: 24px 0 0; color: var(--muted-strong); font-size: 1.16rem; line-height: 1.62; text-wrap: pretty; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
.meta-row span { display: inline-flex; min-height: 34px; align-items: center; border: 1px solid var(--rule); background: var(--chip-bg); color: var(--muted-strong); border-radius: var(--radius); padding: 0 10px; font: 700 12px/1 var(--font-mono); }
.hero-card { border: 1px solid var(--rule-strong); background: var(--surface); padding: 22px; border-radius: var(--radius); }
.hero-card h2 { margin: 0 0 12px; color: var(--headline); font: var(--card-title); }
.hero-card p { margin: 0; color: var(--muted-strong); }
.hero-card .mini-ledger { display: grid; gap: 9px; margin-top: 18px; }
.hero-card .mini-ledger div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; padding-top: 9px; border-top: 1px solid var(--rule); }
.hero-card b { color: var(--accent); font-family: var(--font-mono); font-size: 12px; }
.mobile-toc-toggle { display: none; width: 100%; min-height: 48px; margin: 24px 0 0; border: 1px solid var(--rule-strong); border-radius: var(--radius); background: var(--button-bg); color: var(--fg); font: 700 13px/1 var(--font-mono); cursor: pointer; }
.article-layout { display: grid; grid-template-columns: 260px minmax(0, var(--reader)); justify-content: center; gap: 52px; align-items: start; margin-top: 46px; }
.toc { position: sticky; top: 88px; max-height: calc(100dvh - 116px); overflow: auto; padding-right: 10px; color: var(--muted); font-family: var(--font-mono); font-size: 12px; line-height: 1.35; }
.toc-title { margin: 0 0 14px; color: var(--fg); font-weight: 700; }
.toc a { display: block; padding: 9px 0 9px 12px; border-left: 1px solid var(--rule); color: var(--muted); text-decoration: none; }
.toc a span { display: block; margin-bottom: 2px; color: var(--accent); }
.toc a:hover { color: var(--fg); border-left-color: var(--accent); }
.article-shell { min-width: 0; }
.issue-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin-bottom: 38px; border: 1px solid var(--rule-strong); background: var(--rule-strong); border-radius: var(--radius); overflow: hidden; }
.issue-strip div { min-height: 118px; background: var(--surface); padding: 17px; }
.issue-strip b { display: block; margin-bottom: 10px; color: var(--accent); font: 700 12px/1.3 var(--font-mono); }
.issue-strip span { color: var(--muted-strong); font-size: 0.98rem; line-height: 1.45; }
.article-section { position: relative; padding: 44px 0 58px; border-bottom: 1px solid var(--rule); scroll-margin-top: 88px; }
.article-section:first-child { padding-top: 0; }
.section-folio { display: flex; justify-content: space-between; gap: 18px; align-items: baseline; margin-bottom: 13px; color: var(--accent); font: 700 13px/1.35 var(--font-mono); }
.section-folio b { color: var(--folio); font-family: var(--font-display); font-size: 2rem; line-height: 1; }
.article-section h2 { margin: 0 0 23px; color: var(--headline); font-family: var(--font-display); font-size: 2.9rem; line-height: 1.09; font-weight: var(--section-weight); text-wrap: balance; }
.article-section h3 { margin: 34px 0 14px; color: var(--headline); font-family: var(--font-display); font-size: 1.72rem; line-height: 1.2; font-weight: var(--section-weight); text-wrap: balance; }
.article-section p { margin: 0 0 20px; text-wrap: pretty; }
.article-section.is-intro > p:first-of-type { color: var(--muted-strong); font-size: 1.18rem; line-height: 1.64; }
strong { color: var(--headline); font-weight: 750; }
em { color: var(--accent); }
ul, ol { margin: 0 0 24px; padding-left: 1.25em; }
li { margin: 8px 0; }
li::marker { color: var(--accent); }
code { font-family: var(--font-mono); font-size: 0.88em; color: var(--code-inline-fg); background: var(--code-inline-bg); border: 1px solid var(--code-inline-border); border-radius: 4px; padding: 0.08em 0.32em; overflow-wrap: anywhere; }
.note { margin: 30px 0; border-left: 5px solid var(--accent); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); background: var(--note-bg); padding: 21px 23px; }
.note p:last-child { margin-bottom: 0; }
.note strong:first-child { color: var(--accent); font-family: var(--font-mono); }
.table-wrap { overflow-x: auto; margin: 28px 0 34px; border: 1px solid var(--rule-strong); background: var(--table-bg); border-radius: var(--radius); }
table { width: 100%; min-width: 660px; border-collapse: collapse; font-size: 0.95rem; line-height: 1.48; }
th, td { padding: 14px 14px; border-bottom: 1px solid var(--rule); text-align: left; vertical-align: top; }
th { background: var(--table-head); color: var(--headline); font: 700 13px/1.35 var(--font-mono); }
tr:nth-child(even) td { background: var(--table-stripe); }
tr:last-child td { border-bottom: 0; }
.code-block { margin: 28px 0 34px; border: 1px solid var(--code-border); background: var(--code-bg); color: var(--code-fg); overflow: hidden; border-radius: var(--radius); }
.code-block figcaption { min-height: 40px; margin: 0; padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.16); color: rgba(255,255,255,0.74); font: 700 12px/1 var(--font-mono); }
pre { margin: 0; padding: 20px; overflow: auto; white-space: pre; font: 14px/1.62 var(--font-mono); }
pre code { display: block; color: inherit; background: transparent; border: 0; padding: 0; font-size: inherit; }
pre, .table-wrap, .toc { scrollbar-width: thin; scrollbar-color: var(--rule-strong) transparent; }
pre::-webkit-scrollbar, .table-wrap::-webkit-scrollbar, .toc::-webkit-scrollbar { height: 10px; width: 10px; }
pre::-webkit-scrollbar-track, .table-wrap::-webkit-scrollbar-track, .toc::-webkit-scrollbar-track { background: transparent; }
pre::-webkit-scrollbar-thumb, .table-wrap::-webkit-scrollbar-thumb, .toc::-webkit-scrollbar-thumb { background: var(--rule-strong); border-radius: 5px; }
pre:hover::-webkit-scrollbar-thumb, .table-wrap:hover::-webkit-scrollbar-thumb, .toc:hover::-webkit-scrollbar-thumb { background: var(--accent); }
.footer { padding: 46px 0 20px; color: var(--muted); font: 700 12px/1.4 var(--font-mono); text-align: center; }
@media (max-width: 1060px) {
  .hero { grid-template-columns: 1fr; min-height: 0; }
  .article-layout { grid-template-columns: 1fr; gap: 30px; }
  .toc { display: none; position: static; max-height: none; padding: 14px 0 0; }
  .toc.open { display: block; }
  .mobile-toc-toggle { display: block; }
  .article-shell { width: 100%; max-width: var(--reader); margin: 0 auto; }
  .issue-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  h1 { font-size: 3.55rem; }
}
@media (max-width: 640px) {
  body { font-size: 16px; line-height: 1.66; }
  .preview-bar { grid-template-columns: 1fr; padding: 12px; }
  .actions { justify-content: start; }
  .page { width: min(100% - 24px, var(--max)); padding-top: 24px; }
  .hero { gap: 28px; padding: 26px 0 36px; }
  h1 { font-size: 2.46rem; line-height: 1.08; }
  .dek { font-size: 1.04rem; }
  .hero-card { padding: 16px; }
  .issue-strip { grid-template-columns: 1fr; }
  .article-section h2 { font-size: 2rem; }
  .article-section h3 { font-size: 1.42rem; }
  .section-folio b { font-size: 1.45rem; }
  .note { padding: 18px; }
  pre { padding: 16px; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; }
  table { min-width: 560px; font-size: 0.9rem; }
  th, td { padding: 12px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`;
}

function finalResponsiveCss() {
  return `
@media (max-width: 1060px) {
  .hero { grid-template-columns: 1fr; min-height: 0; }
  .hero-main, .hero-card { grid-column: auto; }
  .hero-card { height: auto; }
  .article-layout { grid-template-columns: 1fr; gap: 30px; }
  .toc { display: none; position: static; max-height: none; padding: 14px 0 0; }
  .toc.open { display: block; }
  .mobile-toc-toggle { display: block; }
  .article-shell { width: 100%; max-width: var(--reader); margin: 0 auto; }
  .issue-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  h1 { font-size: 3.55rem; }
}
@media (max-width: 640px) {
  body { font-size: 16px; line-height: 1.66; }
  .preview-bar { grid-template-columns: 1fr; padding: 12px; }
  .actions { justify-content: start; }
  .page { width: min(100% - 24px, var(--max)); padding-top: 24px; }
  .hero { gap: 28px; padding: 26px 0 36px; }
  h1 { font-size: 2.46rem; line-height: 1.08; }
  .dek { font-size: 1.04rem; }
  .hero-card { padding: 16px; }
  .issue-strip { grid-template-columns: 1fr; }
  .article-section h2 { font-size: 2rem; }
  .article-section h3 { font-size: 1.42rem; }
  .section-folio b { font-size: 1.45rem; }
  .note { padding: 18px; }
  pre { padding: 16px; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; }
  table { min-width: 560px; font-size: 0.9rem; }
  th, td { padding: 12px 10px; }
  .article-section:nth-of-type(4n + 1) { margin-left: 0; margin-right: 0; }
}
`;
}

const variants = [
  {
    id: '05-kami-parchment',
    short: '05 Kami Parchment',
    template: 'doc-kami-parchment',
    description: 'warm parchment long-doc, single serif voice, ink-blue accent',
    filename: 'guard-rails-html-anything-05-kami-parchment.html',
    className: 'variant-kami',
    css: `
:root { color-scheme: light; --max: 1120px; --reader: 760px; --radius: 2px; --bg: #f5f4ed; --surface: #fbfaf3; --bar-bg: #efeee5; --button-bg: #efeee5; --chip-bg: #efeee5; --fg: #1f1d18; --headline: #17150f; --muted: #6b665b; --muted-strong: #3a382f; --rule: #d4d1c5; --rule-strong: #b9b4a7; --accent: #1b365d; --accent-soft: #e4e8ec; --on-accent: #f5f4ed; --folio: #c8c4b8; --note-bg: #efeee5; --table-bg: #fbfaf3; --table-head: #e7e4d7; --table-stripe: #f0efe6; --code-bg: #172033; --code-fg: #f5f4ed; --code-border: #1b365d; --code-inline-bg: #e4e8ec; --code-inline-fg: #1b365d; --code-inline-border: #c8d0da; --font-display: 'Source Serif Pro', 'Iowan Old Style', Georgia, serif; --font-body: 'Source Serif Pro', 'Iowan Old Style', Georgia, serif; --font-mono: 'IBM Plex Mono', ui-monospace, monospace; --display-weight: 500; --section-weight: 500; --card-title: 500 1.55rem/1.16 var(--font-display); }
body { background: linear-gradient(90deg, rgba(31,29,24,0.026) 1px, transparent 1px) 0 0 / 32px 32px, var(--bg); }
.hero { grid-template-columns: 1fr; min-height: 0; padding-top: 52px; }
.hero h1 { max-width: 980px; }
.hero-card { max-width: 880px; box-shadow: 0 0 0 1px #d4d1c5 inset; }
.article-layout { grid-template-columns: 230px minmax(0, var(--reader)); }
.article-section { padding-left: 34px; border-left: 1px solid var(--rule); }
.section-folio { margin-left: -34px; padding-left: 0; }
`,
  },
  {
    id: '06-guizang-eink',
    short: '06 Guizang E-Ink',
    template: 'deck-guizang-editorial',
    description: 'e-ink editorial issue, act dividers, oversized serif rhythm',
    filename: 'guard-rails-html-anything-06-guizang-eink.html',
    className: 'variant-guizang',
    css: `
:root { color-scheme: dark; --max: 1200px; --reader: 790px; --radius: 0; --bg: #0a0a0b; --surface: #f1efea; --bar-bg: #0a0a0b; --button-bg: #18181a; --chip-bg: #18181a; --fg: #f1efea; --headline: #fffaf0; --muted: #aaa49a; --muted-strong: #d8d2c9; --rule: #3a3835; --rule-strong: #65605a; --accent: #d7a75e; --accent-soft: #302313; --on-accent: #0a0a0b; --folio: #4b4844; --note-bg: #18181a; --table-bg: #111112; --table-head: #202022; --table-stripe: #151516; --code-bg: #f1efea; --code-fg: #0a0a0b; --code-border: #d7a75e; --code-inline-bg: #302313; --code-inline-fg: #f1c784; --code-inline-border: #6b4a1e; --font-display: 'Playfair Display', 'Noto Serif', Georgia, serif; --font-body: 'Avenir Next', 'Noto Sans', system-ui, sans-serif; --font-mono: 'IBM Plex Mono', ui-monospace, monospace; --display-weight: 500; --section-weight: 500; --card-title: 500 1.65rem/1.12 var(--font-display); }
.hero { min-height: 70dvh; border: 1px solid var(--rule-strong); padding: 42px; margin-top: 24px; background: #f1efea; color: #0a0a0b; }
.hero h1, .hero .dek, .hero .eyebrow { color: #0a0a0b; }
.hero .eyebrow { color: #7a4d15; }
.hero-card { background: #0a0a0b; color: #f1efea; border-color: #0a0a0b; }
.meta-row span { background: #0a0a0b; color: #f1efea; border-color: #0a0a0b; }
.article-section:nth-of-type(4n + 1) { background: #f1efea; color: #0a0a0b; margin: 40px -28px; padding: 42px 28px 50px; border: 0; }
.article-section:nth-of-type(4n + 1) h2, .article-section:nth-of-type(4n + 1) h3, .article-section:nth-of-type(4n + 1) strong { color: #0a0a0b; }
.article-section:nth-of-type(4n + 1) p, .article-section:nth-of-type(4n + 1) li { color: #252321; }
.issue-strip div { color: #0a0a0b; }
.issue-strip b { color: #9a621e; }
.issue-strip span { color: #252321; }
@media (max-width: 640px) { .article-section:nth-of-type(4n + 1) { margin: 32px 0; padding: 30px 18px 34px; } }
`,
  },
  {
    id: '07-swiss-grid',
    short: '07 Swiss Grid',
    template: 'deck-swiss-international',
    description: '16-column rational grid, IKB accent, no radius, fact-first hierarchy',
    filename: 'guard-rails-html-anything-07-swiss-grid.html',
    className: 'variant-swiss',
    css: `
:root { color-scheme: light; --max: 1240px; --reader: 820px; --radius: 0; --bg: #fafaf8; --surface: #ffffff; --bar-bg: #fafaf8; --button-bg: #ffffff; --chip-bg: #ffffff; --fg: #0a0a0a; --headline: #0a0a0a; --muted: #666666; --muted-strong: #222222; --rule: #d6d6d2; --rule-strong: #0a0a0a; --accent: #002fa7; --accent-soft: #e7edff; --on-accent: #ffffff; --folio: #cfd8ff; --note-bg: #e7edff; --table-bg: #ffffff; --table-head: #002fa7; --table-stripe: #f3f5ff; --code-bg: #0a0a0a; --code-fg: #fafaf8; --code-border: #002fa7; --code-inline-bg: #e7edff; --code-inline-fg: #002fa7; --code-inline-border: #9bb4ff; --font-display: 'IBM Plex Sans Condensed', 'Avenir Next Condensed', system-ui, sans-serif; --font-body: 'IBM Plex Sans', 'Avenir Next', system-ui, sans-serif; --font-mono: 'JetBrains Mono', ui-monospace, monospace; --display-weight: 900; --section-weight: 850; --card-title: 850 1.45rem/1.05 var(--font-display); }
.preview-bar, .action-btn, .hero-card, .meta-row span, .issue-strip, .table-wrap, .code-block { border-radius: 0; }
.hero { grid-template-columns: repeat(16, 1fr); gap: 0; border: 1px solid var(--rule-strong); background: var(--accent); color: var(--on-accent); padding: 0; min-height: 64dvh; }
.hero-main { grid-column: 1 / 12; padding: 44px; }
.hero-card { grid-column: 12 / 17; height: 100%; background: #0a0a0a; color: #fafaf8; border: 0; border-left: 1px solid #fafaf8; }
.hero h1, .hero .dek, .hero .eyebrow { color: #fafaf8; }
.meta-row span { border-color: #fafaf8; background: transparent; color: #fafaf8; }
.article-layout { grid-template-columns: 300px minmax(0, var(--reader)); }
.section-folio b { display: inline-grid; min-width: 78px; min-height: 78px; place-items: center; background: var(--accent); color: #fff; font-family: var(--font-mono); font-size: 1.5rem; }
th { color: #fff; }
.hero-card .kicker { color: #8aa2ff; }
.hero-card h2, .hero-card p, .hero-card .mini-ledger span { color: #fafaf8; }
@media (max-width: 1060px) { .hero-main, .hero-card { grid-column: auto; } .hero-card { height: auto; border-left: 0; border-top: 1px solid #fafaf8; } }
`,
  },
  {
    id: '08-sunday-poster',
    short: '08 Sunday Poster',
    template: 'magazine-poster',
    description: 'newsprint poster, large serif headline, numbered cells, dot paper',
    filename: 'guard-rails-html-anything-08-sunday-poster.html',
    className: 'variant-poster',
    css: `
:root { color-scheme: light; --max: 1180px; --reader: 900px; --radius: 3px; --bg: #f3eee2; --surface: #fbf6ea; --bar-bg: #efe7d5; --button-bg: #fbf6ea; --chip-bg: #ece5d3; --fg: #1f1c17; --headline: #17130f; --muted: #716b5f; --muted-strong: #342f28; --rule: #d3cdbe; --rule-strong: #1f1c17; --accent: #b85a3a; --accent-soft: #ece5d3; --on-accent: #fff9ee; --folio: #d7c1a8; --note-bg: #ece5d3; --table-bg: #fbf6ea; --table-head: #e6d8bf; --table-stripe: #f0e7d6; --code-bg: #1f1c17; --code-fg: #f3eee2; --code-border: #b85a3a; --code-inline-bg: #ece5d3; --code-inline-fg: #7a321d; --code-inline-border: #d6b190; --font-display: 'Playfair Display', 'Iowan Old Style', Georgia, serif; --font-body: 'Iowan Old Style', 'Charter', Georgia, serif; --font-mono: 'IBM Plex Mono', ui-monospace, monospace; --display-weight: 800; --section-weight: 750; --card-title: 750 1.55rem/1.14 var(--font-display); }
body { background: radial-gradient(circle, rgba(31,28,23,0.055) 1px, transparent 1.3px) 0 0 / 16px 16px, var(--bg); }
.hero { display: block; min-height: 0; border-top: 2px solid var(--rule-strong); border-bottom: 2px solid var(--rule-strong); padding: 22px 0 34px; }
.hero-main { max-width: 980px; }
.hero h1 { max-width: 830px; }
.hero-card { margin-top: 28px; max-width: 840px; background: var(--accent-soft); }
.article-layout { display: block; max-width: var(--reader); margin: 44px auto 0; }
.toc { position: static; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; max-height: none; padding: 0 0 30px; border-bottom: 1px solid var(--rule-strong); }
.toc-title { grid-column: 1 / -1; }
.article-section { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 22px; }
.article-section h2, .article-section h3, .article-section p, .article-section ul, .article-section ol, .article-section .note, .article-section .table-wrap, .article-section .code-block { grid-column: 2; }
.section-folio { display: block; grid-column: 1; margin: 0; }
.section-folio b { display: block; margin-top: 12px; font-size: 3.4rem; color: var(--accent); }
`,
  },
  {
    id: '09-nyt-chart-ledger',
    short: '09 NYT Chart Ledger',
    template: 'frame-data-chart-nyt',
    description: 'chart-led newsroom story, red annotations, source-heavy footnotes',
    filename: 'guard-rails-html-anything-09-nyt-chart-ledger.html',
    className: 'variant-nyt',
    css: `
:root { color-scheme: light; --max: 1160px; --reader: 780px; --radius: 4px; --bg: #f7f5ee; --surface: #ffffff; --bar-bg: #f7f5ee; --button-bg: #ffffff; --chip-bg: #f0eee4; --fg: #1a1a1a; --headline: #101010; --muted: #6b6861; --muted-strong: #30302e; --rule: #d8d3c8; --rule-strong: #a9a197; --accent: #a91d1d; --accent-soft: #f0ded8; --on-accent: #fff7ef; --folio: #e3c8bd; --note-bg: #f0eee4; --table-bg: #ffffff; --table-head: #eee8df; --table-stripe: #f7f4ed; --code-bg: #111111; --code-fg: #f7f5ee; --code-border: #a91d1d; --code-inline-bg: #f0ded8; --code-inline-fg: #a91d1d; --code-inline-border: #d9aaa0; --font-display: 'Source Serif Pro', Georgia, serif; --font-body: 'IBM Plex Sans', system-ui, sans-serif; --font-mono: 'IBM Plex Mono', ui-monospace, monospace; --display-weight: 500; --section-weight: 600; --card-title: 600 1.5rem/1.18 var(--font-display); }
.hero { grid-template-columns: minmax(0, 1fr); min-height: 0; padding-bottom: 34px; }
.chart-panel { margin-top: 28px; border-top: 1px solid var(--rule-strong); border-bottom: 1px solid var(--rule-strong); padding: 22px 0; }
.chart-panel svg { display: block; width: 100%; height: auto; }
.hero-card { max-width: 760px; }
.article-section h2 { font-size: 2.55rem; }
.section-folio { border-top: 1px solid var(--rule-strong); padding-top: 12px; }
`,
  },
  {
    id: '10-safety-dossier',
    short: '10 Safety Dossier',
    template: 'deck-safety-alert',
    description: 'hazard stripes, tier cards, incident dossier tone for guard rails',
    filename: 'guard-rails-html-anything-10-safety-dossier.html',
    className: 'variant-alert',
    css: `
:root { color-scheme: dark; --max: 1180px; --reader: 780px; --radius: 2px; --bg: #12110f; --surface: #1b1a16; --bar-bg: #171611; --button-bg: #242116; --chip-bg: #242116; --fg: #f2efe2; --headline: #fff8df; --muted: #a9a08a; --muted-strong: #d4cbb2; --rule: #373124; --rule-strong: #6c5c2c; --accent: #f0b429; --accent-soft: #3a2c0d; --on-accent: #17110a; --folio: #5f241c; --note-bg: #2a2112; --table-bg: #171611; --table-head: #3a2c0d; --table-stripe: #1f1b13; --code-bg: #090908; --code-fg: #f8f2df; --code-border: #c54534; --code-inline-bg: #3a1a14; --code-inline-fg: #ffad9f; --code-inline-border: #7f2d24; --font-display: 'Avenir Next Condensed', 'IBM Plex Sans Condensed', system-ui, sans-serif; --font-body: 'IBM Plex Sans', 'Avenir Next', system-ui, sans-serif; --font-mono: 'JetBrains Mono', ui-monospace, monospace; --display-weight: 900; --section-weight: 850; --card-title: 850 1.45rem/1.08 var(--font-display); }
body { background: repeating-linear-gradient(135deg, rgba(240,180,41,0.12) 0 10px, transparent 10px 24px), var(--bg); background-attachment: fixed; }
.page { background: var(--bg); padding-left: 22px; padding-right: 22px; }
.hero { border: 1px solid var(--rule-strong); padding: 34px; background: linear-gradient(90deg, #1b1a16 0 72%, #3a1a14 72%); }
.hero h1 { text-transform: uppercase; }
.hero h1 .strike { text-decoration: line-through; text-decoration-thickness: 4px; text-decoration-color: #c54534; }
.hero-card { border-color: #c54534; background: #171611; }
.note { border-left-color: #c54534; }
.section-folio b { color: #c54534; }
`,
  },
];

function heroVisual() {
  return `<div class="chart-panel" aria-label="Guard rail layers chart">
  <svg viewBox="0 0 920 330" role="img" aria-labelledby="chart-title">
    <title id="chart-title">Guard rail layers from prompt to tool execution</title>
    <g fill="none" stroke="currentColor" stroke-width="1" opacity="0.25">
      <line x1="40" y1="70" x2="880" y2="70"></line>
      <line x1="40" y1="150" x2="880" y2="150"></line>
      <line x1="40" y1="230" x2="880" y2="230"></line>
    </g>
    <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="13" fill="currentColor">
      <text x="40" y="38">USER PROMPT</text>
      <text x="245" y="38">PROMPT GATE</text>
      <text x="470" y="38">MODEL DECISION</text>
      <text x="700" y="38">PRE-TOOL HOOK</text>
    </g>
    <g>
      <rect x="40" y="92" width="150" height="70" fill="var(--surface)" stroke="var(--rule-strong)"></rect>
      <rect x="260" y="92" width="150" height="70" fill="var(--accent-soft)" stroke="var(--accent)"></rect>
      <rect x="480" y="92" width="150" height="70" fill="var(--surface)" stroke="var(--rule-strong)"></rect>
      <rect x="700" y="92" width="150" height="70" fill="var(--accent-soft)" stroke="var(--accent)"></rect>
      <path d="M190 127 H260 M410 127 H480 M630 127 H700" stroke="var(--accent)" stroke-width="3"></path>
    </g>
    <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="14" fill="currentColor">
      <text x="58" y="122">request</text>
      <text x="58" y="142">arrives</text>
      <text x="280" y="122">simplify</text>
      <text x="280" y="142">gate</text>
      <text x="500" y="122">tool call</text>
      <text x="500" y="142">planned</text>
      <text x="720" y="122">exit 2</text>
      <text x="720" y="142">blocks</text>
    </g>
    <g fill="var(--accent)">
      <circle cx="265" cy="235" r="6"></circle>
      <circle cx="705" cy="235" r="6"></circle>
      <circle cx="810" cy="235" r="6"></circle>
    </g>
    <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="12" fill="currentColor">
      <text x="40" y="260">Hard guarantee lives in hook code. Soft guidance lives in context.</text>
      <text x="40" y="286">If hook crashes, the guard can fail open. The article audits that boundary.</text>
    </g>
  </svg>
</div>`;
}

function heroFor(variant) {
  const strikeTitle = variant.className === 'variant-alert'
    ? title.replace('Guard rails', '<span class="strike">Guard rails</span>')
    : escapeHtml(title);
  const mainClass = variant.className === 'variant-swiss' ? 'hero-main' : 'hero-main';
  const chart = variant.className === 'variant-nyt' ? heroVisual() : '';
  return `<section class="hero" aria-labelledby="article-title">
  <div class="${mainClass}">
    <p class="eyebrow">Inside ClaudeKit / ${escapeHtml(variant.template)}</p>
    <h1 id="article-title">${strikeTitle}</h1>
    <p class="dek">${escapeHtml(description)}</p>
    <div class="meta-row" aria-label="Article metadata">
      <span>${escapeHtml(version)}</span>
      <span>${escapeHtml(created)}</span>
      <span>${counts.sections} sections</span>
      <span>${counts.tables} tables</span>
    </div>
    ${chart}
  </div>
  <aside class="hero-card" aria-label="Visual direction summary">
    <p class="kicker">Template source</p>
    <h2>${escapeHtml(variant.short)}</h2>
    <p>${escapeHtml(variant.description)}</p>
    <div class="mini-ledger">
      <div><b>Hook</b><span>code gate before tool execution</span></div>
      <div><b>Rule</b><span>context gate for workflow behavior</span></div>
      <div><b>Gap</b><span>fail-open cases still need review</span></div>
    </div>
  </aside>
</section>`;
}

function previewHtml(variant) {
  return `<!doctype html>
<html lang="vi" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(variant.short)} - ${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Avenir+Next:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500;1,700&family=Source+Serif+Pro:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>
${baseCss()}
${variant.css}
${finalResponsiveCss()}
  </style>
</head>
<body class="${variant.className}">
  <header class="preview-bar" aria-label="Preview controls">
    <a class="brand" href="../guard-rails-editorial-gallery.html" aria-label="Back to preview gallery">
      <img src="../../../public/logo.png" alt="ClaudeKit logo" width="34" height="34">
      <span>${escapeHtml(variant.short)} / ${escapeHtml(variant.template)}</span>
    </a>
    <div class="actions">
      <a class="action-btn" href="../guard-rails-editorial-gallery.html">Gallery</a>
    </div>
  </header>

  <main class="page">
    ${heroFor(variant)}

    <button class="mobile-toc-toggle" type="button" aria-expanded="false" aria-controls="toc">Mở mục lục</button>

    <div class="article-layout">
      <nav class="toc" id="toc" aria-label="Mục lục">
        <p class="toc-title">Mục lục</p>
        ${tocHtml()}
      </nav>

      <article class="article-shell">
        <div class="issue-strip" aria-label="Guard rail layer summary">
          <div><b>01 / Hook</b><span>Code chạy trước hoặc sau tool call, có thể exit 2 để chặn.</span></div>
          <div><b>02 / Rule</b><span>Text trong context, giúp agent đi đúng workflow.</span></div>
          <div><b>03 / Hard-gate</b><span>XML trong skill markdown, mạnh nhưng vẫn là instruction.</span></div>
          <div><b>04 / Guard skill</b><span>User gọi chủ động: scan, predict, scenario, review.</span></div>
        </div>

        ${sectionsHtml()}
      </article>
    </div>
  </main>

  <footer class="footer">HTML preview only. No Astro conversion in this batch.</footer>

  <script>
    (function () {
      var tocButton = document.querySelector('.mobile-toc-toggle');
      var toc = document.querySelector('.toc');
      if (tocButton && toc) {
        tocButton.addEventListener('click', function () {
          var open = toc.classList.toggle('open');
          tocButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }
    })();
  </script>
</body>
</html>`;
}

function galleryHtml() {
  const oldCards = [
    ['01 Broadsheet', 'guard-rails-editorial-01-broadsheet.html', 'newspaper baseline from the first batch'],
    ['02 Field Manual', 'guard-rails-editorial-02-field-manual.html', 'safety manual from the first batch'],
    ['03 Noir Dossier', 'guard-rails-editorial-03-noir-dossier.html', 'dark investigation from the first batch'],
    ['04 Modern Review', 'guard-rails-editorial-04-modern-review.html', 'clean contemporary review from the first batch'],
  ];
  const allCards = [
    ...oldCards.map(([name, file, desc]) => ({ name, file, desc, source: 'first batch' })),
    ...variants.map((variant) => ({
      name: variant.short,
      file: variant.filename,
      desc: variant.description,
      source: `html-anything/${variant.template}`,
    })),
  ];

  const cards = allCards.map((card, index) => `<a class="preview-card card-${String(index + 1).padStart(2, '0')}" href="mockups/${card.file}">
  <span class="card-kicker">${escapeHtml(card.source)}</span>
  <strong>${escapeHtml(card.name)}</strong>
  <span>${escapeHtml(card.desc)}</span>
  <i aria-hidden="true"></i>
</a>`).join('\n');

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guard rails editorial previews</title>
  <style>
    :root { --bg: #101312; --surface: #f5f1e8; --ink: #f5f1e8; --muted: #aeb6ad; --rule: #303a36; --accent: #e2b15f; --paper: #f5f1e8; --paper-ink: #171714; --blue: #002fa7; --red: #a91d1d; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100dvh; background: radial-gradient(circle at 50% 0, rgba(226,177,95,0.18), transparent 42%), var(--bg); color: var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
    a { color: inherit; }
    .wrap { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 64px; }
    .top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 18px; align-items: center; padding-bottom: 18px; border-bottom: 1px solid var(--rule); }
    .brand { display: inline-flex; align-items: center; gap: 12px; color: var(--ink); text-decoration: none; font-weight: 800; }
    .brand img { width: 36px; height: 36px; object-fit: contain; }
    .source { color: var(--muted); font: 700 12px/1.4 ui-monospace, monospace; }
    h1 { max-width: 860px; margin: 46px 0 14px; font: 800 4rem/1.02 Georgia, serif; text-wrap: balance; }
    .lede { max-width: 760px; margin: 0 0 32px; color: var(--muted); font-size: 1.08rem; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .preview-card { position: relative; min-height: 238px; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; border: 1px solid var(--rule); background: #171b19; color: var(--ink); padding: 22px; text-decoration: none; }
    .preview-card:hover { border-color: var(--accent); }
    .card-kicker { position: relative; z-index: 2; margin-bottom: 10px; color: var(--accent); font: 700 12px/1.35 ui-monospace, monospace; text-transform: uppercase; }
    .preview-card strong { position: relative; z-index: 2; display: block; margin-bottom: 8px; font: 800 2rem/1.06 Georgia, serif; }
    .preview-card span:not(.card-kicker) { position: relative; z-index: 2; max-width: 42ch; color: var(--muted); }
    .preview-card i { position: absolute; inset: 0; opacity: 0.82; }
    .card-01 i { background: linear-gradient(135deg, #f1e7d3 0 45%, #171714 45%); }
    .card-02 i { background: repeating-linear-gradient(135deg, #171714 0 14px, #534118 14px 28px); }
    .card-03 i { background: linear-gradient(135deg, #101010, #4a2018); }
    .card-04 i { background: linear-gradient(135deg, #e8f2ef, #1e6d72); }
    .card-05 i { background: linear-gradient(90deg, #f5f4ed 0 72%, #1b365d 72%); }
    .card-06 i { background: linear-gradient(135deg, #0a0a0b 0 52%, #f1efea 52%); }
    .card-07 i { background: linear-gradient(90deg, #002fa7 0 40%, #fafaf8 40% 70%, #0a0a0a 70%); }
    .card-08 i { background: radial-gradient(circle, rgba(31,28,23,0.12) 1px, transparent 1.4px) 0 0 / 16px 16px, #f3eee2; }
    .card-09 i { background: linear-gradient(135deg, #f7f5ee 0 70%, #a91d1d 70%); }
    .card-10 i { background: repeating-linear-gradient(135deg, #12110f 0 12px, #f0b429 12px 24px, #12110f 24px 36px); }
    .preview-card::after { content: ""; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.78), rgba(0,0,0,0.12)); }
    @media (max-width: 760px) {
      h1 { font-size: 2.55rem; }
      .grid { grid-template-columns: 1fr; }
      .preview-card { min-height: 210px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="top">
      <a class="brand" href="../raw/${slug}.md"><img src="../../public/logo.png" alt="ClaudeKit logo">Inside ClaudeKit</a>
      <div class="source">HTML previews only / ${escapeHtml(version)} / ${escapeHtml(created)}</div>
    </header>
    <h1>Guard rails editorial preview set</h1>
    <p class="lede">Batch mới lấy thêm ngôn ngữ visual từ <code>html-anything</code>: parchment long-doc, e-ink issue, Swiss grid, Sunday poster, NYT chart-led story, và safety dossier. Chưa convert sang Astro.</p>
    <section class="grid" aria-label="Preview variants">
      ${cards}
    </section>
  </main>
</body>
</html>`;
}

fs.mkdirSync(mockupDir, { recursive: true });
for (const variant of variants) {
  fs.writeFileSync(path.join(mockupDir, variant.filename), previewHtml(variant));
}
fs.writeFileSync(galleryPath, galleryHtml());

console.log(`Generated ${variants.length} html-anything previews and gallery.`);
