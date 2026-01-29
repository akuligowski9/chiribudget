/**
 * Jest configuration for integration tests.
 * These tests run against local Supabase with seeded data.
 *
 * Run with: npm run test:integration
 */

module.exports = {
  testMatch: ['**/*.integration.test.js'],
  testEnvironment: 'node', // No DOM needed for DB integration tests
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/integration-setup.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Run serially to avoid race conditions
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(next-intl|use-intl)/)'],
};
