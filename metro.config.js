const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker imports a .wasm binary; Metro must treat it as an
// asset or `expo export --platform all` (used by `eas update`) fails on web.
config.resolver.assetExts.push('wasm');

module.exports = config;
