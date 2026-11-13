import { describe, expect, it, vi } from 'vitest';
import { ClanIntegration } from '../clanIntegration';

describe('installed CLAN application handoff', () => {
    /**
     * Guards: a discovered send2clan receives the selected path and coordinates, while absence produces installation guidance.
     * Kind: contract
     * Not a type: narrow discovery and launch capabilities remove unrelated runtime setup, while installed executable presence and native launch remain external effects.
     * State: typed discovery, launch and dialog observations, without an installed CLAN application or child process.
     * Concurrency: each handoff promise is awaited before checking its effects.
     */
    it('launches only an observed executable', async () => {
        for (const binary of ['/tools/send2clan', null]) {
            const spawnDetached = vi.fn();
            const information = vi.fn();
            const error = vi.fn();
            const findSend2ClanBinary = vi.fn(async () => binary);
            const integration = new ClanIntegration({ runtimeContext: { getPrimaryWorkspaceRoot: () => '/workspace' },
                executableService: { findSend2ClanBinary, spawnDetached },
                window: { showInformationMessage: information, showErrorMessage: error } });
            await integration.openInClan('/workspace/sample.cha', 4, 2);
            expect(findSend2ClanBinary).toHaveBeenCalledWith('/workspace');
            if (binary) {
                expect(spawnDetached).toHaveBeenCalledWith(binary, ['/workspace/sample.cha', '4', '2']);
                expect(information).toHaveBeenCalledWith('Opening sample.cha in CLAN...');
            } else {
                expect(spawnDetached).not.toHaveBeenCalled();
                expect(error).toHaveBeenCalledWith('Install send2clan from Chatter and ensure it is on PATH.');
            }
        }
    });
});
