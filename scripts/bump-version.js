#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Automatic version bumping for release train
 *
 * Usage:
 *   node scripts/bump-version.js [branch]
 *
 * Branch-specific behavior:
 *   - develop (or "patch"): Patch increment (1.0.1 → 1.0.2)
 *   - staging (or "minor"): Minor increment (1.0.2 → 1.1.0)
 *   - main: No increment (promotes staging's version)
 *
 * Updates app.config.js, package.json and store.config.json so the three
 * stay in sync (scripts/check-versions.cjs enforces this in CI). app.config.js
 * and store.config.json are edited as text to keep their formatting intact.
 */

const fs = require('fs');
const path = require('path');

// Get branch from command line or environment
const branch = process.argv[2] || process.env.GITHUB_REF_NAME || 'develop';

console.log(`\n🔄 Version bump for branch: ${branch}\n`);

const appConfigPath = path.join(__dirname, '../app.config.js');
const packageJsonPath = path.join(__dirname, '../package.json');
const storeConfigPath = path.join(__dirname, '../store.config.json');

const appConfigSource = fs.readFileSync(appConfigPath, 'utf8');
const storeConfigSource = fs.readFileSync(storeConfigPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Same pattern as scripts/app-version.cjs, plus the store config's "v" prefix
const appVersionPattern = /^(\s*version:\s*['"])(\d+\.\d+\.\d+)(['"])/m;
const storeVersionPattern = /^(\s*"version":\s*"v)(\d+\.\d+\.\d+)(")/m;

const appMatch = appConfigSource.match(appVersionPattern);
if (!appMatch) {
  console.error('❌ Could not find a semver "version" in app.config.js');
  process.exit(1);
}
if (!storeConfigSource.match(storeVersionPattern)) {
  console.error('❌ Could not find a "version": "vX.Y.Z" in store.config.json');
  process.exit(1);
}

const currentVersion = appMatch[2];
console.log(`📦 Current version: ${currentVersion}`);

// Parse semantic version
const versionParts = currentVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Determine new version based on branch
let newVersion;
let bumpType;

if (
  branch === 'develop' ||
  branch === 'patch' ||
  branch.startsWith('refs/heads/develop')
) {
  // Patch increment for develop
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
  bumpType = 'patch';
} else if (
  branch === 'staging' ||
  branch === 'minor' ||
  branch.startsWith('refs/heads/staging')
) {
  // Minor increment for staging
  minor += 1;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
  bumpType = 'minor';
} else if (branch === 'main' || branch.startsWith('refs/heads/main')) {
  // No increment for main (uses staging's version)
  newVersion = currentVersion;
  bumpType = 'none';
  console.log(`✅ Production branch - keeping version ${newVersion}`);
  process.exit(0);
} else {
  // Unknown branch, no increment
  console.log(`⚠️  Unknown branch: ${branch} - no version bump`);
  process.exit(0);
}

console.log(`🎯 New version: ${newVersion} (${bumpType} bump)`);

// Update app.config.js
fs.writeFileSync(
  appConfigPath,
  appConfigSource.replace(appVersionPattern, `$1${newVersion}$3`),
  'utf8',
);
console.log(`✅ Updated app.config.js`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8',
);
console.log(`✅ Updated package.json`);

// Update store.config.json (App Store metadata, version is "v"-prefixed)
fs.writeFileSync(
  storeConfigPath,
  storeConfigSource.replace(storeVersionPattern, `$1${newVersion}$3`),
  'utf8',
);
console.log(`✅ Updated store.config.json`);

console.log(
  `\n🎉 Version bumped successfully: ${currentVersion} → ${newVersion}\n`,
);

// Output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump_type=${bumpType}\n`);
}
