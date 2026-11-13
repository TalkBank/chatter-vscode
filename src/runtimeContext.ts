export type BulletDisplayMode = 'dim' | 'hidden' | 'normal';
export type ValidationSeverity = 'all' | 'errorsOnly' | 'errorsAndWarnings';

export interface RuntimeWorkspaceFacade {
    workspaceFolders?: readonly {
        uri: {
            fsPath: string;
        };
    }[];
    getConfiguration: (
        section?: string
    ) => {
        get<T>(key: string, defaultValue?: T): T;
    };
}

export interface ExtensionRuntimeContext {
    getPrimaryWorkspaceRoot(): string | undefined;
    getConfiguredLspBinaryPath(): string;
    getInlayHintsEnabled(): boolean;
    getValidationSeverity(): ValidationSeverity;
    getBulletDisplayMode(): BulletDisplayMode;
    getWalkerAutoPlay(): boolean;
    getWalkerLoopCount(): number;
    getWalkerPauseSeconds(): number;
    getWalkerWalkLength(): number;
    getMediaDefaultSpeed(): number;
    getTranscriptionDefaultSpeaker(): string;
    getTranscriptionRewindSeconds(): number;
}

export interface DefaultExtensionRuntimeContextOptions {
    workspace?: RuntimeWorkspaceFacade;
}

const BULLET_DISPLAY_MODES: readonly BulletDisplayMode[] = [
    'dim',
    'hidden',
    'normal',
];

const VALIDATION_SEVERITIES: readonly ValidationSeverity[] = [
    'all',
    'errorsOnly',
    'errorsAndWarnings',
];

function createEmptyWorkspace(): RuntimeWorkspaceFacade {
    return {
        workspaceFolders: undefined,
        getConfiguration() {
            return {
                get<T>(_key: string, defaultValue?: T): T {
                    return defaultValue as T;
                },
            };
        },
    };
}

export function normalizeBulletDisplayMode(value: string): BulletDisplayMode {
    return BULLET_DISPLAY_MODES.includes(value as BulletDisplayMode)
        ? (value as BulletDisplayMode)
        : 'dim';
}

export function normalizeValidationSeverity(value: string): ValidationSeverity {
    return VALIDATION_SEVERITIES.includes(value as ValidationSeverity)
        ? (value as ValidationSeverity)
        : 'all';
}

/**
 * Shared boundary for VS Code runtime state that would otherwise be read
 * from the current workspace and configuration.
 */
export class DefaultExtensionRuntimeContext implements ExtensionRuntimeContext {
    private readonly workspace: RuntimeWorkspaceFacade;

    constructor(options: DefaultExtensionRuntimeContextOptions = {}) {
        this.workspace = options.workspace ?? createEmptyWorkspace();
    }

    getPrimaryWorkspaceRoot(): string | undefined {
        return this.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    getConfiguredLspBinaryPath(): string {
        return this.workspace
            .getConfiguration('talkbank.lsp')
            .get<string>('binaryPath', '');
    }

    getInlayHintsEnabled(): boolean {
        return this.workspace
            .getConfiguration('talkbank.inlayHints')
            .get<boolean>('enabled', true);
    }

    getValidationSeverity(): ValidationSeverity {
        const severity = this.workspace
            .getConfiguration('talkbank.validation')
            .get<string>('severity', 'all');
        return normalizeValidationSeverity(severity);
    }

    getBulletDisplayMode(): BulletDisplayMode {
        const mode = this.workspace
            .getConfiguration('talkbank.bullets')
            .get<string>('display', 'dim');
        return normalizeBulletDisplayMode(mode);
    }

    getWalkerAutoPlay(): boolean {
        return this.workspace.getConfiguration('talkbank').get<boolean>('walker.autoPlay', true);
    }

    getWalkerLoopCount(): number {
        return this.workspace.getConfiguration('talkbank').get<number>('walker.loopCount', 1);
    }

    getWalkerPauseSeconds(): number {
        return this.workspace.getConfiguration('talkbank').get<number>('walker.pauseSeconds', 0);
    }

    getWalkerWalkLength(): number {
        return this.workspace.getConfiguration('talkbank').get<number>('walker.walkLength', 0);
    }

    getMediaDefaultSpeed(): number {
        return this.workspace.getConfiguration('talkbank').get<number>('media.defaultSpeed', 100);
    }

    getTranscriptionDefaultSpeaker(): string {
        return this.workspace
            .getConfiguration('talkbank')
            .get<string>('transcription.defaultSpeaker', 'CHI');
    }

    getTranscriptionRewindSeconds(): number {
        return this.workspace
            .getConfiguration('talkbank')
            .get<number>('transcription.rewindSeconds', 2);
    }

}
