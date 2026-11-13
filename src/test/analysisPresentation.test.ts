/** Projection preserves the admitted JSON values used by real CLAN reports. */
import { describe, expect, it } from 'vitest';
import { AnalysisPresentation } from '../analysisPresentation';

describe('analysis presentation', () => {
    /**
     * Guards: nested FREQ words retain their speaker path, counts and computed columns.
     * Kind: policy
     * Not a type: scalar-only cells prevent object coercion, while projection must still preserve the input values and nesting labels.
     * State: a pure admitted JSON observation matching the nested speakers/entries wire shape, without a webview or filesystem.
     * Concurrency: none, preparation owns its local traversal and result.
     */
    it('projects nested word counts and retains zero and false values', () => {
        const prepared = AnalysisPresentation.prepare({ speakers: [{
            speaker: 'CHI', total_tokens: 1,
            entries: [{ word: 'want', count: 1 }, { word: 'cookie', count: 0 }],
            sampled: false,
        }] });
        expect(prepared.tables).toEqual([
            {
                title: 'speakers / CHI / entries',
                columns: [{ kind: 'text', key: 'word' }, { kind: 'numeric', key: 'count', maximum: 1 }],
                rows: [{ word: 'want', count: 1 }, { word: 'cookie', count: 0 }],
            },
            {
                title: 'speakers',
                columns: [
                    { kind: 'text', key: 'speaker' },
                    { kind: 'numeric', key: 'total_tokens', maximum: 1 },
                    { kind: 'text', key: 'sampled' },
                ],
                rows: [{ speaker: 'CHI', total_tokens: 1, sampled: false }],
            },
        ]);
    });
});
