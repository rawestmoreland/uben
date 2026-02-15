#!/usr/bin/env node

/**
 * Generate PocketBase import JSON from local seed data.
 *
 * Reads every noun seed file and the categories file, computes the same
 * deterministic remote IDs that the app assigns locally, and writes two
 * JSON files ready to paste into the PocketBase admin import UI.
 *
 * Usage:
 *   node scripts/generate-pb-import.js
 *
 * Output:
 *   pb-import-categories.json
 *   pb-import-nouns.json
 */

const fs = require('fs');
const path = require('path');

// ── Hash function (mirrors database/remote-id.ts exactly) ────────────

function hashToId(input) {
  let h1 = 0x811c9dc5; // FNV-1a offset basis
  let h2 = 5381; // djb2 seed

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 = ((h2 << 5) + h2 + c) & 0xffffffff;
  }

  // Each 32-bit hash → 7 base36 chars.  XOR the two to derive a 15th char.
  const p1 = (h1 >>> 0).toString(36).padStart(7, '0');
  const p2 = (h2 >>> 0).toString(36).padStart(7, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(36).padStart(7, '0');
  return (p1 + p2 + p3).slice(0, 15);
}

function generateNounRemoteId(german, article) {
  return hashToId(`noun:${german}:${article}`);
}

function generateCategoryRemoteId(name) {
  return hashToId(`category:${name}`);
}

// ── Seed file reader ─────────────────────────────────────────────────

/**
 * Extract the exported array from a TypeScript seed file.
 * Works because the array literal itself is valid JS — we just need to
 * strip the TS-specific parts (import, type annotation, export keyword).
 */
function extractArray(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Match everything from the first `[` to the last `]`
  const match = content.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!match) {
    throw new Error(`Could not extract array from ${filePath}`);
  }

  // The array literal is pure JS — evaluate it
  return new Function(`return ${match[1]}`)();
}

// ── Main ─────────────────────────────────────────────────────────────

const seedDir = path.join(__dirname, '..', 'database', 'seeds');
const outDir = path.join(__dirname, '..');

// ── Categories ───────────────────────────────────────────────────────

const categories = extractArray(path.join(seedDir, 'categories.ts'));

const pbCategories = categories.map((cat) => ({
  id: generateCategoryRemoteId(cat.name),
  name: cat.name,
  display_name: cat.display_name,
  display_order: cat.display_order,
}));

// ── Nouns (all seed files, deduplicated) ─────────────────────────────

const nounsDir = path.join(seedDir, 'nouns');
const nounFiles = fs
  .readdirSync(nounsDir)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .sort();

const allNouns = [];
for (const file of nounFiles) {
  const nouns = extractArray(path.join(nounsDir, file));
  allNouns.push(...nouns);
}

// Deduplicate by (german, article) — last occurrence wins (matches UPSERT behavior)
const nounMap = new Map();
for (const noun of allNouns) {
  nounMap.set(`${noun.german}:${noun.article}`, noun);
}

const pbNouns = [...nounMap.values()].map((noun) => ({
  id: generateNounRemoteId(noun.german, noun.article),
  german: noun.german,
  article: noun.article,
  plural: noun.plural || '',
  english: noun.english || '',
  level: noun.level,
  category: noun.category,
}));

// ── Write output ─────────────────────────────────────────────────────

fs.writeFileSync(
  path.join(outDir, 'pb-import-categories.json'),
  JSON.stringify(pbCategories, null, 2),
);

fs.writeFileSync(
  path.join(outDir, 'pb-import-nouns.json'),
  JSON.stringify(pbNouns, null, 2),
);

console.log('Generated PocketBase import files:');
console.log(`  pb-import-categories.json  (${pbCategories.length} categories)`);
console.log(`  pb-import-nouns.json       (${pbNouns.length} nouns)`);
console.log('');
console.log(
  'Open the PocketBase admin UI → Collection → Import records → paste the JSON.',
);
