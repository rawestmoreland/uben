module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // scripts/ holds standalone node tooling (e.g. store-screenshots/spec.js is a
  // layout spec, not a Jest test), so keep Jest from picking up its *.spec.js files.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/scripts/'],
};
