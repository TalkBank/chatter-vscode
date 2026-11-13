// esbuild config for VS Code extension bundling.
//
// The extension entrypoint `src/extension.ts` and its entire reachable module
// graph are bundled into `dist/extension.js`, so the shipped VSIX does not
// need to carry `node_modules/` at runtime. Webview JS (sandboxed, separate
// context) is copied verbatim; it is not part of this bundle.
//
// `vscode` is always resolved at runtime by the host; never bundle it.

import { build, context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const watchMode = process.argv.includes('--watch');
const production = process.argv.includes('--production');

const buildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
};

// The browser webview imports this standalone ESM/WASM asset separately.
await mkdir('dist/vendor', { recursive: true });
await copyFile('node_modules/@hpcc-js/wasm/dist/graphviz.js', 'dist/vendor/graphviz.js');

if (watchMode) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.error('esbuild watching...');
} else {
    await build(buildOptions);
}
