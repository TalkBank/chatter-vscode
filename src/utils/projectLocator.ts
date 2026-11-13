/**
 * Utility for locating the project root directory.
 *
 * Searches for Cargo.toml by traversing up the directory tree.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Result of project root search.
 */
export type ProjectSearchResult =
    | { readonly found: true; readonly path: string }
    | { readonly found: false; readonly path: null };

/**
 * Options for project root search.
 */
export interface ProjectLocatorOptions {
    /**
     * Directory to start searching from.
     */
    startPath: string;

    /**
     * Maximum number of parent directories to traverse.
     * Defaults to 10.
     */
    maxDepth?: number;

    /**
     * Filesystem operations (for testing).
     * Defaults to Node.js fs module.
     */
    fs?: {
        existsSync: (path: string) => boolean;
    };
}

/**
 * Finds the project root by searching for Cargo.toml.
 *
 * Traverses up the directory tree from startPath, looking for Cargo.toml.
 * Stops at filesystem root or after maxDepth iterations.
 *
 * Native path operations normalize candidates and handle the host platform
 * separators. Injected observations use the same native paths.
 *
 * @param options - Configuration for search behavior
 * @returns Search result with found status and path
 * @throws Never throws - returns not found on any error
 *
 * @example
 * ```typescript
 * // Search from workspace folder
 * const result = await findProjectRoot({
 *   startPath: '/workspace/chatter/vscode/src'
 * });
 *
 * if (result.found) {
 *   console.log(`Project root: ${result.path}`);
 * } else {
 *   console.log('No Cargo.toml found');
 * }
 * ```
 */
export async function findProjectRoot(
    options: ProjectLocatorOptions
): Promise<ProjectSearchResult> {
    const { startPath, maxDepth = 10, fs: fsOps = fs } = options;

    try {
        let current = startPath;

        for (let i = 0; i < maxDepth; i++) {
            const cargoToml = path.join(current, 'Cargo.toml');

            if (fsOps.existsSync(cargoToml)) {
                return {
                    found: true,
                    path: current
                };
            }

            const parent = path.dirname(current);

            // Stop if we've reached filesystem root (parent === current).
            if (parent === current) {
                break;
            }

            current = parent;
        }

        // Not found within maxDepth
        return {
            found: false,
            path: null
        };
    } catch (error) {
        // Any unexpected error - return not found
        return {
            found: false,
            path: null
        };
    }
}
