#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Automatic version bumping for release train
 *
 * Usage:
 *   node scripts/bump-version.js [branch]
 *
 * Branch-specific behavior:
 *   - develop: Patch increment (1.0.1 → 1.0.2)
 *   - staging: Minor increment (1.0.2 → 1.1.0)
 *   - main: No increment (promotes staging's version)
 *
 * Updates both app.json and package.json
 */

const fs = require('fs');
const path = require('path');

// Get branch from command line or environment
const branch = process.argv[2] || process.env.GITHUB_REF_NAME || 'develop';

console.log(`\n🔄 Version bump for branch: ${branch}\n`);

// Read current versions
const appJsonPath = path.join(__dirname, '../app.json');
const packageJsonPath = path.join(__dirname, '../package.json');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const currentVersion = appJson.expo.version;
console.log(`📦 Current version: ${currentVersion}`);

// Parse semantic version
const versionParts = currentVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Determine new version based on branch
let newVersion;
let bumpType;

if (branch === 'develop' || branch.startsWith('refs/heads/develop')) {
  // Patch increment for develop
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
  bumpType = 'patch';
} else if (branch === 'staging' || branch.startsWith('refs/heads/staging')) {
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

// Update app.json
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log(`✅ Updated app.json`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8',
);
console.log(`✅ Updated package.json`);

console.log(
  `\n🎉 Version bumped successfully: ${currentVersion} → ${newVersion}\n`,
);

// Output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump_type=${bumpType}\n`);
}
