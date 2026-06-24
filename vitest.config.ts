/**
 * Vitest configuration for VS Code extension tests.
 *
 * Configures test environment, coverage, and file patterns.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Use Node.js environment (not jsdom) since we're testing VS Code extension code
        environment: 'node',

        // Test file patterns. Integration tests under src/test/integration/
        // run in a real VS Code host via @vscode/test-cli (mocha + the real
        // `vscode` module), not under vitest, so they are excluded here.
        include: ['src/test/**/*.test.ts'],
        exclude: ['node_modules', 'out', '.vscode-test', 'src/test/integration/**'],

        // Enable globals (describe, it, expect without imports)
        globals: true,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/test/**',
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/test/**'
            ],
            // Aim for high coverage since we're following TDD.
            // Vitest 4.x requires thresholds under `thresholds` (the flat
            // form was removed); this nesting is the post-bump shape.
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80
            }
        },

        // Test timeout (increase for slow operations)
        testTimeout: 10000,

        // Reporter configuration
        reporters: ['verbose'],

        // Mock configuration
        mockReset: true,
        clearMocks: true,
        restoreMocks: true
    },

    // Resolve configuration for TypeScript paths
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
