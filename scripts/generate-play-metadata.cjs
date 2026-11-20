#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Builds the Google Play listing text that `fastlane supply` uploads, from the
 * same copy the App Store uses.
 *
 * Sources:
 *   store.config.json          apple.info.<locale>: title, description, releaseNotes
 *   store.config.android.json  info.<locale>: shortDescription (required), plus
 *                              optional title / description / releaseNotes overrides
 *                              (use these when the App Store copy doesn't fit Play)
 *
 * Output (generated, gitignored): fastlane/metadata/android/<play-locale>/
 *   title.txt, short_description.txt, full_description.txt, changelogs/default.txt
 *
 * Play has no keywords or promo text; contact details, privacy policy, category and
 * content rating are app-level settings in Play Console, so they are not generated.
 *
 * Usage:
 *   node scripts/generate-play-metadata.cjs          validate and write the files
 *   node scripts/generate-play-metadata.cjs --check  validate only, write nothing
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'fastlane', 'metadata', 'android');

// Google Play listing limits, in characters
const LIMITS = {
  title: 30,
  shortDescription: 80,
  fullDescription: 4000,
  releaseNotes: 500,
};

// Locale keys used in store.config.json -> Google Play language codes
const PLAY_LOCALES = {
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'de-DE': 'de-DE',
  'fr-FR': 'fr-FR',
  'es-ES': 'es-ES',
  'es-MX': 'es-419',
  'it': 'it-IT',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-PT',
  'ru': 'ru-RU',
  'pl': 'pl-PL',
  'tr': 'tr-TR',
  'hu': 'hu-HU',
  'nl-NL': 'nl-NL',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function lengthOf(text) {
  // Count characters the way a person would (not UTF-16 code units)
  return [...text].length;
}

/**
 * Merges the App Store copy with the Android file into one entry per locale.
 * Returns { listings, problems } and never throws on bad content.
 */
function buildListings(storeConfig, androidConfig) {
  const problems = [];
  const apple = storeConfig.apple?.info ?? {};
  const android = androidConfig.info ?? {};
  const listings = [];

  for (const locale of Object.keys(android)) {
    if (!(locale in apple)) problems.push(`${locale} is in store.config.android.json but not in store.config.json`);
  }

  for (const [locale, appleCopy] of Object.entries(apple)) {
    const playLocale = PLAY_LOCALES[locale];
    if (!playLocale) {
      problems.push(`${locale}: no Google Play language code, add it to PLAY_LOCALES`);
      continue;
    }
    const overrides = android[locale];
    if (!overrides) {
      problems.push(`${locale}: missing from store.config.android.json`);
      continue;
    }

    const listing = {
      locale,
      playLocale,
      title: overrides.title ?? appleCopy.title,
      shortDescription: overrides.shortDescription,
      fullDescription: overrides.description ?? appleCopy.description,
      releaseNotes: overrides.releaseNotes ?? appleCopy.releaseNotes,
    };

    for (const [field, max] of Object.entries(LIMITS)) {
      const value = listing[field];
      if (typeof value !== 'string' || !value.trim()) {
        problems.push(`${locale}: ${field} is empty`);
      } else if (lengthOf(value) > max) {
        problems.push(`${locale}: ${field} is ${lengthOf(value)} characters (max ${max})`);
      }
    }
    listings.push(listing);
  }

  const seen = new Map();
  for (const { locale, playLocale } of listings) {
    if (seen.has(playLocale)) problems.push(`${locale} and ${seen.get(playLocale)} both map to ${playLocale}`);
    seen.set(playLocale, locale);
  }

  return { listings, problems };
}

function writeListings(listings) {
  // The folder is fully generated, so clear it to drop locales that were removed
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  for (const listing of listings) {
    const dir = path.join(OUTPUT_DIR, listing.playLocale);
    fs.mkdirSync(path.join(dir, 'changelogs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'title.txt'), listing.title.trim());
    fs.writeFileSync(path.join(dir, 'short_description.txt'), listing.shortDescription.trim());
    fs.writeFileSync(path.join(dir, 'full_description.txt'), listing.fullDescription.trim());
    fs.writeFileSync(path.join(dir, 'changelogs', 'default.txt'), listing.releaseNotes.trim());
  }
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const { listings, problems } = buildListings(readJson('store.config.json'), readJson('store.config.android.json'));

  if (problems.length > 0) {
    console.error(`❌ Invalid Google Play metadata:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }

  if (checkOnly) {
    console.log(`✅ Google Play metadata is valid for ${listings.length} locales (nothing written)`);
    return;
  }
  writeListings(listings);
  console.log(
    `✅ Wrote Google Play metadata for ${listings.length} locales to ${path.relative(ROOT, OUTPUT_DIR)}: ` +
      listings.map((l) => l.playLocale).join(', '),
  );
}

if (require.main === module) main();

module.exports = { buildListings, LIMITS, PLAY_LOCALES };
