#!/usr/bin/env node
/**
 * Validates i18n JSON files for truncated content.
 *
 * Detects ACTUAL truncation patterns:
 * - Ends with conjunction expecting more (hoặc, or, 或, と, và, and)
 * - Ends with preposition expecting object (trong, in, 在, に, vào)
 * - Ends with unclosed HTML tag
 * - Ends with comma followed by space
 *
 * Does NOT flag (valid patterns):
 * - List headers ending with ":"
 * - Bullet point fragments
 * - Short descriptions
 * - Proper sentence endings
 *
 * Usage: node scripts/validate-i18n-completeness.js [path/to/i18n.json]
 */

const fs = require('fs');
const path = require('path');

// Patterns that DEFINITELY indicate truncation
const TRUNCATION_PATTERNS = [
  // Conjunctions at end expecting more content
  { pattern: /\s+(hoặc|hoặc là|hay là|và cả)$/i, desc: 'Vietnamese conjunction at end' },
  { pattern: /\s+(or|and)\s*$/i, desc: 'English conjunction at end' },
  { pattern: /\s+(或|或者|和|與)\s*$/i, desc: 'Chinese conjunction at end' },
  { pattern: /\s+(と|や|また|および)\s*$/i, desc: 'Japanese conjunction at end' },

  // "Có" alone after separator (Vietnamese "With")
  { pattern: /·\s*Có\s*$/i, desc: 'Vietnamese "Có" truncated' },
  { pattern: /·\s*With\s*$/i, desc: 'English "With" truncated' },
  { pattern: /·\s*有\s*$/i, desc: 'Chinese "有" truncated' },
  { pattern: /·\s*あり\s*$/i, desc: 'Japanese "あり" truncated' },

  // Unclosed HTML tags (opened but not closed)
  { pattern: /<code>[^<]{0,50}$/, desc: 'Unclosed <code> tag' },
  { pattern: /<strong>[^<]{0,50}$/, desc: 'Unclosed <strong> tag' },
  { pattern: /<em>[^<]{0,50}$/, desc: 'Unclosed <em> tag' },

  // Ends with comma + space (mid-list)
  { pattern: /,\s*$/, desc: 'Ends with comma (mid-list)' },

  // Specific truncation markers from the known issues
  { pattern: /trùng tên,\s*$/i, desc: 'Vietnamese truncation after "trùng tên"' },
  { pattern: /same name,\s*$/i, desc: 'English truncation after "same name"' },
  { pattern: /Toggle:\s*$/i, desc: 'Truncated Toggle instruction' },
  { pattern: /切换：\s*$/i, desc: 'Chinese truncated Toggle' },
  { pattern: /切り替え：\s*$/i, desc: 'Japanese truncated Toggle' },

  // Articles/determiners at very end expecting noun
  { pattern: /\s+(một|các|những)\s*$/i, desc: 'Vietnamese article at end' },
  { pattern: /\s+(the|a|an)\s*$/i, desc: 'English article at end' },
];

// Keys to skip (intentionally end with colons or fragments)
const SKIP_KEY_PATTERNS = [
  /_intro$/,      // Intros often end with ":"
  /_desc$/,       // Descriptions can be fragments
  /_title$/,      // Titles are fragments
  /_hint$/,       // Hints are fragments
  /_body$/,       // Body text with lists
  /^s\d+_/,       // Section content (varied format)
  /rule\d/,       // Rule descriptions
  /opt\d/,        // Option descriptions
];

function shouldSkipKey(key) {
  // Only validate keys likely to have full sentences
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];

  // Focus on sR_ keys which are the Rules section (where truncations occurred)
  if (!lastPart.startsWith('sR_')) {
    return true; // Skip non-Rules section for now
  }

  return false;
}

function detectTruncation(value, key) {
  if (typeof value !== 'string') return null;
  if (shouldSkipKey(key)) return null;

  const trimmed = value.trim();
  if (trimmed.length < 30) return null;

  for (const { pattern, desc } of TRUNCATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { key, value: trimmed, reason: desc };
    }
  }

  return null;
}

function validateI18nFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let data;

  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`\x1b[31mError parsing ${filePath}: ${e.message}\x1b[0m`);
    return [];
  }

  const issues = [];

  function traverse(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        traverse(value, fullKey);
      } else if (typeof value === 'string') {
        const issue = detectTruncation(value, fullKey);
        if (issue) issues.push(issue);
      }
    }
  }

  traverse(data);
  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  let files;

  if (args.length > 0) {
    files = args.filter(f => fs.existsSync(f));
  } else {
    const { glob } = require('glob');
    files = await glob('sites/**/i18n/**/*.json', {
      cwd: process.cwd(),
      absolute: true
    });
  }

  if (files.length === 0) {
    console.log('No i18n files found.');
    return;
  }

  console.log(`\x1b[36mValidating ${files.length} i18n file(s) for truncations...\x1b[0m\n`);

  let totalIssues = 0;

  for (const file of files) {
    const issues = validateI18nFile(file);

    if (issues.length > 0) {
      console.log(`\x1b[33m${path.relative(process.cwd(), file)}\x1b[0m`);
      for (const issue of issues) {
        totalIssues++;
        const preview = issue.value.length > 100
          ? '...' + issue.value.slice(-100)
          : issue.value;
        console.log(`  \x1b[31m${issue.key}\x1b[0m`);
        console.log(`    ${preview}`);
        console.log(`    \x1b[90mReason: ${issue.reason}\x1b[0m\n`);
      }
    }
  }

  if (totalIssues === 0) {
    console.log('\x1b[32mNo truncation issues detected in sR_ keys.\x1b[0m');
  } else {
    console.log(`\x1b[31mFound ${totalIssues} truncation(s). Fix these before deploying.\x1b[0m`);
    process.exit(1);
  }
}

main().catch(console.error);
