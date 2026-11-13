/** Search policy uses typed metadata observations, with native path semantics. */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as path from 'node:path';
import { ExecutableService } from '../executableService';
import { findProjectRoot, type ProjectLocatorOptions, type ProjectSearchResult } from '../utils/projectLocator';

function observedFiles(paths: readonly string[]): NonNullable<ProjectLocatorOptions['fs']> {
    const files = new Set(paths);
    return { existsSync: candidate => files.has(candidate) };
}

type PathLookup = { readonly kind: 'found'; readonly path: string } | { readonly kind: 'missing' };

describe('discovery policy', () => {
    /**
     * Guards: CLI search selects debug, release, PATH or absence in the prescribed priority.
     * Kind: policy
     * Not a type: the typed executable port cannot statically select among changing file and PATH observations.
     * State: a shared typed file-observation double and closed PATH outcomes, with no disk or child process.
     * Concurrency: none, each case owns its observations and awaits resolution.
     */
    it('resolves executable observations through the shared service', async () => {
        const root = path.resolve('/project');
        const debug = path.join(root, 'target', 'debug', 'chatter');
        const release = path.join(root, 'target', 'release', 'chatter');
        const installed = path.resolve('/tools/chatter');
        const cases: readonly {
            readonly files: readonly string[];
            readonly root: string | undefined;
            readonly lookup: PathLookup;
            readonly expected: string | null;
        }[] = [
            { files: [debug], root, lookup: { kind: 'missing' }, expected: debug },
            { files: [release], root, lookup: { kind: 'missing' }, expected: release },
            { files: [debug, release], root, lookup: { kind: 'missing' }, expected: debug },
            { files: [], root, lookup: { kind: 'found', path: installed }, expected: installed },
            { files: [], root: undefined, lookup: { kind: 'found', path: installed }, expected: installed },
            { files: [], root, lookup: { kind: 'missing' }, expected: null },
        ];
        for (const observation of cases) {
            const service = new ExecutableService({
                fs: observedFiles(observation.files),
                execFileSync: () => {
                    switch (observation.lookup.kind) {
                        case 'found': return `${observation.lookup.path}\n`;
                        case 'missing': throw new Error('No PATH match');
                    }
                },
            });
            expect(await service.findTalkBankCli({ projectRoot: observation.root })).toBe(observation.expected);
        }
    });

    /**
     * Guards: project discovery observes nearest ancestors, the explicit/default depth limit and filesystem root.
     * Kind: policy
     * Not a type: the result union rules out mismatched found/path states, while ancestor selection depends on exact file observations.
     * State: shared typed file observations use native paths, without disk, cwd changes or module mocks.
     * Concurrency: none, each case owns its observation set and awaits resolution.
     */
    it('selects an observed project root within its search bounds', async () => {
        const root = path.parse(path.resolve('/workspace')).root;
        const workspace = path.join(root, 'workspace');
        const project = path.join(workspace, 'project');
        const deep = path.join(root, ...Array.from({ length: 11 }, (_, index) => `level${index}`));
        const absent: ProjectSearchResult = { found: false, path: null };
        const cases: readonly {
            readonly start: string;
            readonly files: readonly string[];
            readonly maxDepth?: number;
            readonly expected: ProjectSearchResult;
        }[] = [
            { start: workspace, files: [path.join(workspace, 'Cargo.toml')], expected: { found: true, path: workspace } },
            { start: path.join(project, 'src', 'subdir'), files: [path.join(project, 'Cargo.toml')], expected: { found: true, path: project } },
            { start: deep, files: [path.join(root, 'Cargo.toml')], maxDepth: 5, expected: absent },
            { start: workspace, files: [], expected: absent },
            { start: root, files: [], expected: absent },
            { start: deep, files: [path.join(root, 'Cargo.toml')], expected: absent },
        ];
        for (const observation of cases) {
            expect(await findProjectRoot({
                startPath: observation.start,
                maxDepth: observation.maxDepth,
                fs: observedFiles(observation.files),
            })).toEqual(observation.expected);
        }
    });

    /**
     * Guards: a Cargo marker in generated native ancestors is discovered at its exact directory.
     * Kind: policy
     * Not a type: legal segment generation removes malformed fixture setup, while native path construction and ancestor selection must preserve the observed marker location.
     * State: generated path values and the shared typed observation double, without disk or processes.
     * Concurrency: each asynchronous property is awaited by fast-check and by the test runner.
     */
    it('finds markers across generated ancestor chains', async () => {
        await fc.assert(fc.asyncProperty(
            fc.array(fc.stringMatching(/^[a-z][a-z0-9_-]{0,8}$/), { minLength: 1, maxLength: 5 }),
            async segments => {
                const root = path.parse(path.resolve('/workspace')).root;
                const directory = path.join(root, ...segments);
                expect(await findProjectRoot({
                    startPath: path.join(directory, 'subdir'),
                    fs: observedFiles([path.join(directory, 'Cargo.toml')]),
                })).toEqual({ found: true, path: directory });
            },
        ), { numRuns: 50 });
    });
});
