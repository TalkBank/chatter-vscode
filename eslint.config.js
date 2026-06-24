// ESLint flat config (ESLint 9.x), replacing the legacy .eslintrc.json.
// Mirrors the original rules as closely as possible.

const tsEslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        files: ['src/**/*.ts'],
        plugins: {
            '@typescript-eslint': tsEslint,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        rules: {
            // TypeScript-ESLint recommended rules (subset of most useful ones)
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/naming-convention': [
                'warn',
                // Default: camelCase for values (functions, methods, locals).
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'allow',
                },
                // Variables may also be UPPER_CASE (module constants) or
                // PascalCase (namespace-style imports / re-exported types).
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
                // Parameters: camelCase, or PascalCase when a destructured
                // type/generic name flows in.
                {
                    selector: 'parameter',
                    format: ['camelCase', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
                // Imports may be camelCase (functions) or PascalCase (classes/
                // namespaces).
                {
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                },
                // Types are PascalCase (class, interface, type alias, enum,
                // type parameter): the standard TypeScript convention.
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
                {
                    selector: 'enumMember',
                    format: ['PascalCase', 'UPPER_CASE'],
                },
                // Object-literal and type property keys frequently mirror an
                // external schema (the VS Code API, webview PostMessage
                // protocols, JSON-RPC payloads), so do not impose a casing
                // convention on them.
                {
                    selector: ['objectLiteralProperty', 'typeProperty'],
                    format: null,
                },
            ],
            // Base rules from original config
            curly: 'warn',
            eqeqeq: 'warn',
            'no-throw-literal': 'warn',
        },
    },
];
