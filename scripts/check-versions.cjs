#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Fails if the app version differs between app.config.js, package.json and
 * store.config.json. Reads files as text so it needs no dependencies and runs
 * before `npm ci`.
 *
 * Usage: node scripts/check-versions.cjs
 */

const fs = require('fs');
const path = require('path');

const read = (file) =>
  fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const versions = {
  'app.config.js': read('app.config.js').match(
    /^\s*version:\s*['"](\d+\.\d+\.\d+)['"]/m,
  )?.[1],
  'package.json': JSON.parse(read('package.json')).version,
  // The store config prefixes the version with "v"
  'store.config.json': JSON.parse(
    read('store.config.json'),
  ).apple?.version?.replace(/^v/, ''),
};

for (const [file, version] of Object.entries(versions)) {
  console.log(`${file.padEnd(20)} ${version ?? '(not found)'}`);
}

if (
  Object.values(versions).some((version) => !version) ||
  new Set(Object.values(versions)).size !== 1
) {
  console.error(
    '\n❌ Versions are out of sync. Run the bump or update all three files to match.',
  );
  process.exit(1);
}

console.log('\n✅ Versions match');
