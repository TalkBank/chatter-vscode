/**
 * Narrow text-file I/O boundary for extension commands.
 *
 * Commands should not reach directly into synchronous `fs` helpers. This
 * service keeps file reads injectable and routes failures through Effect.
 */

import { promises as fs } from 'fs';

import { Context } from 'effect';

/**
 * Text-file reader used by extension commands.
 */
export interface TextFileReader {
    /**
     * Read one UTF-8 text file asynchronously.
     */
    readUtf8(filePath: string): Promise<string>;
}

/**
 * Effect service for text-file reads.
 */
export class TextFileService extends Context.Service<TextFileService, TextFileReader>()('talkbank/TextFileService') {}

/**
 * Default Node-backed text-file reader.
 */
export class NodeTextFileService implements TextFileReader {
    /**
     * Read one UTF-8 file from the local filesystem.
     */
    async readUtf8(filePath: string): Promise<string> {
        return fs.readFile(filePath, 'utf-8');
    }
}
