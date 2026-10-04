#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Prints the app version from app.config.js (the single source of truth).
 *
 * CI uses this instead of reading app.json, which does not exist. It reads the
 * file as text so it needs no dependencies and works before `npm ci`.
 * Fails loudly if the version can't be found, so a workflow never tags "v".
 *
 * Usage: VERSION=$(node scripts/app-version.cjs)
 */

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../app.config.js'), 'utf8');
const match = source.match(/^\s*version:\s*['"](\d+\.\d+\.\d+)['"]/m);

if (!match) {
  console.error('Could not find a semver "version" in app.config.js');
  process.exit(1);
}

console.log(match[1]);
