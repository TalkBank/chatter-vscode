import { describe, expect, it } from 'vitest';
import {
    DefaultExtensionRuntimeContext,
    normalizeBulletDisplayMode,
    normalizeValidationSeverity,
    type RuntimeWorkspaceFacade,
} from '../runtimeContext';

function createWorkspace(
    values: Record<string, Record<string, unknown>>,
    workspaceRoot = '/workspace',
): RuntimeWorkspaceFacade {
    return {
        workspaceFolders: [{ uri: { fsPath: workspaceRoot } }],
        getConfiguration(section = '') {
            const sectionValues = values[section] ?? {};
            return {
                get<T>(key: string, defaultValue?: T): T {
                    return (key in sectionValues
                        ? sectionValues[key]
                        : defaultValue) as T;
                },
            };
        },
    };
}

describe('configuration admission policy', () => {
    /**
     * Guards: supported severity and bullet settings retain their meanings, and unknown external values select the documented defaults.
     * Kind: policy
     * Not a type: closed output unions constrain consumers, while configuration files can supply arbitrary strings at admission.
     * State: pure known and unknown string observations, without workspace or editor effects.
     * Concurrency: none, normalization is synchronous.
     */
    it('normalizes observed enum settings', () => {
        for (const value of ['all', 'errorsOnly', 'errorsAndWarnings'] as const) {
            expect(normalizeValidationSeverity(value)).toBe(value);
        }
        for (const value of ['dim', 'hidden', 'normal'] as const) {
            expect(normalizeBulletDisplayMode(value)).toBe(value);
        }
        expect(normalizeValidationSeverity('mystery')).toBe('all');
        expect(normalizeBulletDisplayMode('mystery')).toBe('dim');
    });
});

describe('DefaultExtensionRuntimeContext', () => {
    /**
     * Guards: configured editor and media values are read from their intended native configuration sections.
     * Kind: contract
     * Not a type: typed getters constrain consumers, while externally supplied sections and keys determine the observed values.
     * State: one shared configuration-observation fixture, without a native editor or home-directory override.
     * Concurrency: none, each test owns its immutable workspace values.
     */
    it('reads workspace-root and configuration values through the shared boundary', () => {
        const runtimeContext = new DefaultExtensionRuntimeContext({
            workspace: createWorkspace({
                'talkbank.lsp': { binaryPath: '/tmp/chatter' },
                'talkbank.inlayHints': { enabled: false },
                'talkbank.validation': { severity: 'errorsOnly' },
                'talkbank.bullets': { display: 'hidden' },
                talkbank: {
                    'walker.autoPlay': false,
                    'walker.loopCount': 3,
                    'walker.pauseSeconds': 1.5,
                    'walker.walkLength': 12,
                    'media.defaultSpeed': 75,
                    'transcription.defaultSpeaker': 'MOT',
                    'transcription.rewindSeconds': 4,
                },
            }, '/tmp/workspace'),
        });

        expect(runtimeContext.getPrimaryWorkspaceRoot()).toBe('/tmp/workspace');
        expect(runtimeContext.getConfiguredLspBinaryPath()).toBe('/tmp/chatter');
        expect(runtimeContext.getInlayHintsEnabled()).toBe(false);
        expect(runtimeContext.getValidationSeverity()).toBe('errorsOnly');
        expect(runtimeContext.getBulletDisplayMode()).toBe('hidden');
        expect(runtimeContext.getWalkerAutoPlay()).toBe(false);
        expect(runtimeContext.getWalkerLoopCount()).toBe(3);
        expect(runtimeContext.getWalkerPauseSeconds()).toBe(1.5);
        expect(runtimeContext.getWalkerWalkLength()).toBe(12);
        expect(runtimeContext.getMediaDefaultSpeed()).toBe(75);
        expect(runtimeContext.getTranscriptionDefaultSpeaker()).toBe('MOT');
        expect(runtimeContext.getTranscriptionRewindSeconds()).toBe(4);
    });

    /**
     * Guards: missing native configuration observations receive the documented editor and media defaults.
     * Kind: contract
     * Not a type: the native configuration boundary can omit values, so defaults remain a user-visible admission policy.
     * State: one shared configuration-observation fixture, without a native editor or home-directory override.
     * Concurrency: none, each test owns its immutable workspace values.
     */
    it('uses safe defaults when configuration values are absent', () => {
        const runtimeContext = new DefaultExtensionRuntimeContext({
            workspace: createWorkspace({}, '/tmp/workspace'),
        });

        expect(runtimeContext.getConfiguredLspBinaryPath()).toBe('');
        expect(runtimeContext.getInlayHintsEnabled()).toBe(true);
        expect(runtimeContext.getValidationSeverity()).toBe('all');
        expect(runtimeContext.getBulletDisplayMode()).toBe('dim');
        expect(runtimeContext.getWalkerAutoPlay()).toBe(true);
        expect(runtimeContext.getWalkerLoopCount()).toBe(1);
        expect(runtimeContext.getWalkerPauseSeconds()).toBe(0);
        expect(runtimeContext.getWalkerWalkLength()).toBe(0);
        expect(runtimeContext.getMediaDefaultSpeed()).toBe(100);
        expect(runtimeContext.getTranscriptionDefaultSpeaker()).toBe('CHI');
        expect(runtimeContext.getTranscriptionRewindSeconds()).toBe(2);
    });

});
