/**
 * Tests for shared webview/panel message contracts.
 */

import { describe, expect, it } from 'vitest';

import { PanelMessageDecodeError } from '../effectBoundary';
import {
    decodeAnalysisPanelWebviewMessage,
    decodeIdEditorPanelWebviewMessage,
    decodeKidevalPanelWebviewMessage,
    decodeMediaPanelWebviewMessage,
    decodeWaveformPanelWebviewMessage,
} from '../webviewMessageContracts';

describe('webview message contracts', () => {
    /**
     * Guards: CSV export accepts text and rejects numeric CSV payloads.
     * Kind: wire
     * Not a type: the browser sends unknown messages across the webview bridge.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('decodes analysis CSV export requests', () => {
        expect(decodeAnalysisPanelWebviewMessage({
            command: 'exportCsv',
            csv: 'word,count\nwant,4\n',
        })).toEqual({
            command: 'exportCsv',
            csv: 'word,count\nwant,4\n',
        });

        expect(() => decodeAnalysisPanelWebviewMessage({
            command: 'exportCsv',
            csv: 4,
        })).toThrow(PanelMessageDecodeError);
    });

    /**
     * Guards: ID editor save messages retain their participant fields.
     * Kind: wire
     * Not a type: browser JSON must pass schema admission before typed editing.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('decodes ID editor save requests', () => {
        const entries = [
            {
                line: 3,
                fields: {
                    language: 'eng',
                    corpus: 'Example',
                    speaker: 'CHI',
                    age: '2;03',
                    sex: 'male',
                    group: '',
                    ses: '',
                    role: 'Target_Child',
                    education: '',
                    custom: '',
                },
            },
        ];

        expect(decodeIdEditorPanelWebviewMessage({
            command: 'save',
            entries,
        })).toEqual({
            command: 'save',
            entries,
        });


    });

    /**
     * Guards: media timestamps and segment messages decode while negative indices fail.
     * Kind: wire
     * Not a type: browser events contain numeric values before admission.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('decodes media panel messages', () => {
        const timestamp = 1250;

        expect(decodeMediaPanelWebviewMessage({
            command: 'segmentChanged',
            index: 2,
        })).toEqual({
            command: 'segmentChanged',
            index: 2,
        });

        expect(decodeMediaPanelWebviewMessage({
            command: 'timestamp',
            ms: timestamp,
        })).toEqual({
            command: 'timestamp',
            ms: timestamp,
        });

        expect(decodeMediaPanelWebviewMessage({
            command: 'stopped',
        })).toEqual({
            command: 'stopped',
        });

        expect(() => decodeMediaPanelWebviewMessage({
            command: 'segmentChanged',
            index: -1,
        })).toThrow(PanelMessageDecodeError);

    });

    /**
     * Guards: waveform seek messages reject negative timestamps.
     * Kind: wire
     * Not a type: browser JSON can contain a negative timestamp before its admitted timestamp type.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('decodes waveform seek requests', () => {
        const timestamp = 900;

        expect(decodeWaveformPanelWebviewMessage({
            command: 'seek',
            ms: timestamp,
        })).toEqual({
            command: 'seek',
            ms: timestamp,
        });

        expect(() => decodeWaveformPanelWebviewMessage({
            command: 'seek',
            ms: -5,
        })).toThrow(PanelMessageDecodeError);

    });

    /**
     * Guards: assessment messages admit zero-month bounds and reject unknown gender, empty speaker selections and invalid age bounds.
     * Kind: wire
     * Not a type: browser JSON can select a variant or gender outside the closed admitted union.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('decodes kideval messages', () => {
        expect(decodeKidevalPanelWebviewMessage({
            command: 'discoverDatabases',
            libDir: '/Users/Shared/CLAN/lib/kideval',
        })).toEqual({
            command: 'discoverDatabases',
            libDir: '/Users/Shared/CLAN/lib/kideval',
        });

        expect(decodeKidevalPanelWebviewMessage({
            command: 'runAnalysis',
            databasePath: '/Users/Shared/CLAN/lib/kideval/eng.cut',
            databaseFilter: {
                language: 'eng',
                group: 'TD',
                gender: 'Female',
                age_from_months: 24,
                age_to_months: 48,
                speaker_codes: ['CHI'],
            },
        })).toEqual({
            command: 'runAnalysis',
            databasePath: '/Users/Shared/CLAN/lib/kideval/eng.cut',
            databaseFilter: {
                language: 'eng',
                group: 'TD',
                gender: 'Female',
                age_from_months: 24,
                age_to_months: 48,
                speaker_codes: ['CHI'],
            },
        });

        expect(decodeKidevalPanelWebviewMessage({
            command: 'exportCsv',
            csv: 'measure,z\nmlu,-1.2\n',
        })).toEqual({
            command: 'exportCsv',
            csv: 'measure,z\nmlu,-1.2\n',
        });

        expect(decodeKidevalPanelWebviewMessage({
            command: 'runAnalysis', databaseFilter: { age_from_months: 0, age_to_months: 0 },
        })).toEqual({ command: 'runAnalysis', databaseFilter: { age_from_months: 0, age_to_months: 0 } });
        for (const databaseFilter of [
            { gendre: 'Female' },
            { speaker_codes: [] }, { age_from_months: -1 }, { age_to_months: 0x1_0000_0000 },
        ]) {
            expect(() => decodeKidevalPanelWebviewMessage({ command: 'runAnalysis', databaseFilter }))
                .toThrow(PanelMessageDecodeError);
        }

        expect(() => decodeKidevalPanelWebviewMessage({
            command: 'runAnalysis',
            databaseFilter: {
                gender: 'Unknown',
            },
        })).toThrow(PanelMessageDecodeError);

    });
});
