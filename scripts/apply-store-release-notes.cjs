#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Writes per-locale App Store "what's new" text into store.config.json.
 *
 * Input is a JSON file mapping every locale in store.config.json to
 * { "releaseNotes": string, "promoText": string }. Values are replaced in
 * place as text so the rest of the file keeps its formatting. Fails (without
 * writing) if a locale is missing or extra, or a value breaks App Store limits.
 *
 * Usage: node scripts/apply-store-release-notes.cjs <notes.json>
 */

const fs = require('fs');
const path = require('path');

const RELEASE_NOTES_MAX = 4000;
const PROMO_TEXT_MAX = 170;
const FIELDS = ['releaseNotes', 'promoText'];

const notesPath = process.argv[2];
if (!notesPath) {
  console.error('Usage: node scripts/apply-store-release-notes.cjs <notes.json>');
  process.exit(1);
}

const storeConfigPath = path.join(__dirname, '../store.config.json');
const source = fs.readFileSync(storeConfigPath, 'utf8');
const locales = Object.keys(JSON.parse(source).apple.info);
const notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));

const problems = [];
for (const locale of locales) {
  if (!notes[locale]) problems.push(`missing locale ${locale}`);
}
for (const locale of Object.keys(notes)) {
  if (!locales.includes(locale)) problems.push(`unknown locale ${locale}`);
}
for (const locale of locales) {
  for (const field of FIELDS) {
    const value = notes[locale]?.[field];
    if (typeof value !== 'string' || !value.trim()) {
      problems.push(`${locale}.${field} is empty`);
    }
  }
  const { releaseNotes = '', promoText = '' } = notes[locale] ?? {};
  if (releaseNotes.length > RELEASE_NOTES_MAX) {
    problems.push(`${locale}.releaseNotes is over ${RELEASE_NOTES_MAX} characters`);
  }
  if (promoText.length > PROMO_TEXT_MAX) {
    problems.push(`${locale}.promoText is ${promoText.length} characters (max ${PROMO_TEXT_MAX})`);
  }
}
if (problems.length > 0) {
  console.error(`❌ Invalid release notes:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

// Each locale block starts at a 6-space-indented key under "info"
let updated = source;
for (const locale of locales) {
  const blockStart = updated.search(new RegExp(`^ {6}"${locale}": \\{`, 'm'));
  const nextBlock = updated.slice(blockStart + 1).search(/^ {6}"[\w-]+": \{|^ {4}\}/m);
  const blockEnd = blockStart + 1 + nextBlock;
  let block = updated.slice(blockStart, blockEnd);

  for (const field of FIELDS) {
    const pattern = new RegExp(`^( *"${field}": )".*"(,?)$`, 'm');
    if (!pattern.test(block)) {
      console.error(`❌ Could not find "${field}" in the ${locale} block`);
      process.exit(1);
    }
    block = block.replace(pattern, (_, key, comma) => `${key}${JSON.stringify(notes[locale][field])}${comma}`);
  }
  updated = updated.slice(0, blockStart) + block + updated.slice(blockEnd);
}

// Confirm the result is valid JSON and holds exactly what was asked for
const result = JSON.parse(updated).apple.info;
for (const locale of locales) {
  for (const field of FIELDS) {
    if (result[locale][field] !== notes[locale][field]) {
      console.error(`❌ ${locale}.${field} did not round-trip; store.config.json left unchanged`);
      process.exit(1);
    }
  }
}

fs.writeFileSync(storeConfigPath, updated, 'utf8');
console.log(`✅ Updated releaseNotes and promoText for ${locales.length} locales`);
