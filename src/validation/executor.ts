/**
 * Validation and cache-clear CLI execution for the validation explorer.
 */

import { CliExitError, type TalkBankCliExecutableService } from '../executableService';
import { Schema } from 'effect';
import * as path from 'node:path';
import { findProjectRoot, type ProjectSearchResult } from '../utils/projectLocator';

/**
 * Validation status for a file.
 */
export enum ValidationStatus {
    Valid = 'valid',
    Invalid = 'invalid',
    Validating = 'validating',
    Cached = 'cached',
    Unchecked = 'unchecked',
    InternalError = 'internal_error',
    ReadError = 'read_error'
}

/**
 * One validation issue returned by the CLI JSON output.
 */
export interface FileValidationIssue {
    code: string;
    severity: string;
    message: string;
    line?: number;
    column?: number;
}

/**
 * Validation result for one CHAT file.
 */
export type FileValidationResult = { readonly path: string } & (
    | { readonly status: ValidationStatus.Valid | ValidationStatus.Cached; readonly isCacheHit: boolean; readonly errors?: never }
    | { readonly status: ValidationStatus.Invalid; readonly errorCount: number; readonly errors: readonly FileValidationIssue[] }
    | { readonly status: ValidationStatus.ReadError | ValidationStatus.InternalError; readonly errors: readonly FileValidationIssue[] }
    | { readonly status: ValidationStatus.Validating | ValidationStatus.Unchecked; readonly errors?: never }
);

/**
 * Executor configuration and test seams.
 */
export interface ValidationExecutorOptions {
    workspaceRoot?: string;
    executableService: TalkBankCliExecutableService;
    locateCli?: () => Promise<string | null>;
    findProjectRoot?: (options: { startPath: string }) => Promise<ProjectSearchResult>;
}

const Diagnostic = Schema.Struct({ code: Schema.String, severity: Schema.Literals(['Error', 'Warning']), message: Schema.String });
const FileFields = { type: Schema.Literal('file'), file: Schema.String };
const FileRecord = Schema.Union([
    Schema.Struct({ ...FileFields, status: Schema.Literal('valid'), cache_hit: Schema.Boolean }),
    Schema.Struct({ ...FileFields, status: Schema.Literal('invalid'), error_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)), errors: Schema.Array(Diagnostic) }),
    Schema.Struct({ ...FileFields, status: Schema.Literal('read_error'), error: Schema.String }),
    Schema.Struct({ ...FileFields, status: Schema.Literal('internal_failure'), error: Schema.String, errors: Schema.Array(Diagnostic) }),
]);
const Envelope = Schema.Struct({ type: Schema.Literals(['file', 'summary', 'cache', 'notice']) });
const CompleteSummary = Schema.Struct({ type: Schema.Literal('summary'), outcome: Schema.Literal('complete'), total_files: Schema.Literal(1) });

/** Admit one completed single-file JSONL run, retaining its file provenance. */
export function parseValidationResult(filePath: string, output: string): FileValidationResult {
    let file: typeof FileRecord.Type | undefined;
    let complete = false;
    for (const line of output.trim().split(/\r?\n/)) {
        const raw: unknown = JSON.parse(line);
        const envelope = Schema.decodeUnknownSync(Envelope)(raw);
        if (complete) { throw new Error('Validation record after terminal summary'); }
        switch (envelope.type) {
            case 'file':
                if (file) { throw new Error('Multiple file results for one input'); }
                file = Schema.decodeUnknownSync(FileRecord)(raw);
                if (path.resolve(file.file) !== path.resolve(filePath)) { throw new Error('Validation source mismatch'); }
                break;
            case 'summary':
                Schema.decodeUnknownSync(CompleteSummary)(raw);
                complete = true;
                break;
            case 'cache': case 'notice': break;
        }
    }
    if (!file || !complete) { throw new Error('Incomplete single-file validation output'); }
    switch (file.status) {
        case 'valid': return { path: filePath, status: file.cache_hit ? ValidationStatus.Cached : ValidationStatus.Valid, isCacheHit: file.cache_hit };
        case 'invalid': return { path: filePath, status: ValidationStatus.Invalid, errorCount: file.error_count, errors: file.errors };
        case 'read_error': return { path: filePath, status: ValidationStatus.ReadError, errors: [{ code: 'read_error', severity: 'Error', message: file.error }] };
        case 'internal_failure': return { path: filePath, status: ValidationStatus.InternalError, errors: [...file.errors, { code: 'internal_failure', severity: 'Error', message: file.error }] };
    }
}

/**
 * Runs validation-explorer CLI commands while keeping binary discovery local.
 */
export class ValidationExecutor {
    private readonly workspaceRoot: string | undefined;
    private readonly executableService: TalkBankCliExecutableService;
    private readonly locateCli?: () => Promise<string | null>;
    private readonly findProjectRootFn: (
        options: { startPath: string }
    ) => Promise<ProjectSearchResult>;

    constructor(options: ValidationExecutorOptions) {
        this.workspaceRoot = options.workspaceRoot;
        this.executableService = options.executableService;
        this.locateCli = options.locateCli;
        this.findProjectRootFn = options.findProjectRoot ?? findProjectRoot;
    }

    /**
     * Validate one file through the TalkBank CLI.
     */
    async validateFile(filePath: string): Promise<FileValidationResult> {
        const cliPath = await this.resolveCliPath();
        let output: string;
        try {
            output = this.executableService.runTalkBankCli(cliPath, ['validate', filePath, '--format', 'json']);
        } catch (error) {
            if (!(error instanceof CliExitError) || error.exitCode !== 1) { throw error; }
            output = error.stdout;
        }
        return parseValidationResult(filePath, output);
    }

    /**
     * Preview cache clear results for a path.
     */
    async previewCacheClear(targetPath: string): Promise<string> {
        const cliPath = await this.resolveCliPath();
        return this.executableService.runTalkBankCli(cliPath, [
            'cache',
            'clear',
            '--prefix',
            targetPath,
            // Chatter defaults to a non-writing preview.
        ]);
    }

    /**
     * Clear cached validation results for a path.
     */
    async clearCache(targetPath: string): Promise<string> {
        const cliPath = await this.resolveCliPath();
        return this.executableService.runTalkBankCli(cliPath, [
            'cache',
            'clear',
            '--prefix',
            targetPath,
            '--apply'
        ]);
    }

    private async resolveCliPath(): Promise<string> {
        const cliPath = this.locateCli
            ? await this.locateCli()
            : await this.findTalkBankCliPath();

        if (!cliPath) {
            throw new Error('chatter CLI not found. Please build the project first.');
        }

        return cliPath;
    }

    private async findTalkBankCliPath(): Promise<string | null> {
        const projectRoot = await this.findProjectRootDir();

        return await this.executableService.findTalkBankCli({
            projectRoot: projectRoot || undefined
        });
    }

    private async findProjectRootDir(): Promise<string | null> {
        if (!this.workspaceRoot) {
            return null;
        }

        const result = await this.findProjectRootFn({
            startPath: this.workspaceRoot
        });

        return result.path;
    }
}
