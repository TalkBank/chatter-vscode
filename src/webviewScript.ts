/** Typed panel payloads enter one JSON/script encoding boundary. */
import type { AnalysisPresentation } from './analysisPresentation';
import type { ClanCommand } from './lsp/clanClient';
import type { Segment } from './utils/bulletParser';

export interface AssessmentScriptConfig {
    readonly title: string;
    readonly analyzeCommand: 'kideval' | 'eval' | 'eval-d';
    readonly description: string;
    readonly defaultLibDir: string | null;
}

interface MediaScriptData {
    readonly segments: readonly Segment[];
    readonly mediaUri: string;
    readonly startIndex: number;
    readonly defaultSpeed: number;
    readonly loopCount: number;
    readonly pauseMilliseconds: number;
    readonly walkLength: number;
}

/** Each variant owns every global required by that panel's browser script. */
export type PanelScriptData =
    | { readonly kind: 'analysis'; readonly presentation: AnalysisPresentation; readonly command: ClanCommand['command']; readonly fileName: string }
    | { readonly kind: 'assessment'; readonly config: AssessmentScriptConfig }
    | { readonly kind: 'graph'; readonly dotSource: string; readonly graphvizUri: string }
    | ({ readonly kind: 'audio' | 'video' } & MediaScriptData)
    | { readonly kind: 'waveform'; readonly segments: readonly Segment[]; readonly mediaUri: string };

/** Encode a complete panel payload into its owning template slot. */
export function injectPanelScript(template: string, data: PanelScriptData): string {
    switch (data.kind) {
        case 'analysis':
            return inject(template, '<!--INJECT_DATA-->', {
                TABLES: data.presentation.tables,
                CMD_NAME: data.command,
                FILE_NAME: data.fileName,
            });
        case 'assessment':
            return inject(template, '<!--INJECT_CONFIG-->', { MODE_CONFIG: data.config });
        case 'graph':
            return inject(template, '<!--INJECT_DATA-->', {
                dotSource: data.dotSource,
                GRAPHVIZ_URI: data.graphvizUri,
            });
        case 'audio':
        case 'video':
            return inject(template, '<!--INJECT_DATA-->', {
                SEGMENTS: data.segments,
                MEDIA_URI: data.mediaUri,
                START_IDX: data.startIndex,
                IS_VIDEO: data.kind === 'video',
                DEFAULT_SPEED: data.defaultSpeed,
                LOOP_COUNT: data.loopCount,
                PAUSE_MS: data.pauseMilliseconds,
                WALK_LENGTH: data.walkLength,
            });
        case 'waveform':
            return inject(template, '<!--INJECT_DATA-->', {
                SEGMENTS: data.segments,
                MEDIA_URI: data.mediaUri,
            });
    }
}

function inject(template: string, slot: string, bindings: Readonly<Record<string, unknown>>): string {
    const declarations = Object.entries(bindings).map(([name, value]) =>
        `const ${name} = ${JSON.stringify(value).replace(/</g, '\\u003c')};`,
    ).join('\n');
    const script = `<script>\n${declarations}\n</script>`;
    return template.replace(slot, () => script);
}
