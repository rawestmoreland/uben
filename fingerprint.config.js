const { SourceSkips } = require('@expo/fingerprint');

/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  // package.json "scripts" are npm/CI shortcuts (e.g. `update:staging`, `build:prod`),
  // not native code. Hashing them made every script edit change the runtime version,
  // which orphaned existing preview builds and forced a full rebuild instead of an OTA.
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
};
