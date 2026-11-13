import { describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import { ExecutableService } from '../executableService';
import { createExecFileDouble, observedFiles, extensionPaths } from './mocks/childProcess';

describe('ExecutableService', () => {
    /**
     * Guards: argv preserves shell syntax, empty values, quotes and Unicode exactly.
     * Kind: contract
     * Not a type: an argument-vector API rules out shell construction, while OS process delivery still crosses a native boundary.
     * State: one real Node child echoes its argv, without files, network or editor state.
     * Concurrency: the synchronous child exits before the assertion.
     */
    it('delivers literal arguments to a native child', () => {
        const args = ['$(printf altered)', '`printf altered`', '$HOME', '', 'a "quote"', 'Ω 🧪'];
        const output = new ExecutableService().runTalkBankCli(process.execPath, [
            '-e', 'process.stdout.write( JSON.stringify(process.argv.slice(1)) )', ...args,
        ]);
        expect(JSON.parse(output)).toEqual(args);
    });

    /**
     * Guards: LSP discovery follows configured, bundled, PATH, development-build and absent observations in priority order.
     * Kind: policy
     * Not a type: typed path and process observations cannot statically choose among changing external file locations.
     * State: shared exact-argv and file-observation doubles, without files, processes or global platform mutation.
     * Concurrency: none, each case owns its observations.
     */
    it('selects the highest-priority observed LSP executable', () => {
        const configured = path.resolve('/tools/configured-lsp');
        const bundled = extensionPaths.asAbsolutePath(`server/talkbank-lsp${process.platform === 'win32' ? '.exe' : ''}`);
        const installed = path.resolve('/tools/talkbank-lsp');
        const development = extensionPaths.asAbsolutePath('../target/release/talkbank-lsp');
        const locator = process.platform === 'win32' ? 'where.exe' : 'which';
        for (const item of [
            { files: [configured, bundled, installed, development], expected: configured },
            { files: [bundled, installed, development], expected: bundled },
            { files: [installed, development], expected: installed },
            { files: [development], expected: development },
            { files: [], expected: null },
        ]) {
            const execFileSync = createExecFileDouble([{ executable: locator, args: ['talkbank-lsp'],
                outcome: { kind: 'stdout', value: `${installed}\n${path.resolve('/second/match')}\n` } }]);
            const service = new ExecutableService({ fs: observedFiles(item.files), execFileSync });
            expect(service.findTalkbankLspBinary(extensionPaths, configured)).toBe(item.expected);
            if (item.expected === configured || item.expected === bundled) { expect(execFileSync).not.toHaveBeenCalled(); }
        }
    });

    /**
     * Guards: failed PATH lookup permits nearest-ancestor send2clan discovery.
     * Kind: policy
     * Not a type: the correct ancestor depends on observed files after the external locator refuses a match.
     * State: shared typed process and filesystem doubles, without native resources.
     * Concurrency: the discovery promise completes within this test.
     */
    it('finds send2clan in an ancestor build directory', async () => {
        const executable = path.resolve('/workspace/target/debug/send2clan');
        const service = new ExecutableService({ fs: observedFiles([executable]),
            execFileSync: createExecFileDouble([{ executable: process.platform === 'win32' ? 'where.exe' : 'which',
                args: ['send2clan'], outcome: { kind: 'failure', error: new Error('No PATH match') } }]),
        });
        expect(await service.findSend2ClanBinary(path.resolve('/workspace/project/subdir'))).toBe(executable);
    });

    /**
     * Guards: detached launch passes literal arguments and releases the parent reference.
     * Kind: contract
     * Not a type: the narrow spawn port requires an unref capability, while the adapter must still invoke it with the intended options.
     * State: a typed spawn double records the launch and unref effect, without a child process.
     * Concurrency: none, launch and unref are synchronous observations.
     */
    it('detaches a launched process', () => {
        const unref = vi.fn();
        const spawn = vi.fn(() => ({ unref }));
        new ExecutableService({ spawn }).spawnDetached('/tools/send2clan', ['/data/a b.cha', '10', '2']);
        expect(spawn).toHaveBeenCalledWith('/tools/send2clan', ['/data/a b.cha', '10', '2'], { detached: true, stdio: 'ignore' });
        expect(unref).toHaveBeenCalledOnce();
    });
});
