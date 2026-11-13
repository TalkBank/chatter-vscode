/** Current Chatter cache wire contract, decoded once at process admission. */
import { Schema } from 'effect';
import type { TalkBankCliExecutableService } from '../executableService';

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER));
const Current = { database: Schema.Literal('current'), total_entries: Count };
const CacheStatisticsSchema = Schema.Union([
    Schema.Struct({ database: Schema.Literal('absent'), cache_dir: Schema.String }),
    Schema.Struct({ database: Schema.Literal('older_schema'), cache_dir: Schema.String }),
    Schema.Struct({ ...Current, cache_dir: Schema.Null, cache_size_bytes: Schema.Null, last_modified: Schema.Null }),
    Schema.Struct({ ...Current, cache_dir: Schema.String, cache_size_bytes: Schema.Null, last_modified: Schema.Null }),
    Schema.Struct({ ...Current, cache_dir: Schema.String, cache_size_bytes: Count, last_modified: Schema.String }),
]);

export type CacheStatistics = typeof CacheStatisticsSchema.Type;

export class CacheStatisticsManager {
    constructor(
        private readonly cliPath: string,
        private readonly executableService: Pick<TalkBankCliExecutableService, 'runTalkBankCli'>,
    ) {}

    async getCacheStatistics(): Promise<CacheStatistics | null> {
        try {
            const output = this.executableService.runTalkBankCli(this.cliPath, ['cache', 'stats', '--format', 'json']);
            return Schema.decodeUnknownSync(CacheStatisticsSchema)(JSON.parse(output));
        } catch {
            return null;
        }
    }

    static formatBytes(bytes: number): string {
        if (bytes === 0) { return '0 B'; }
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        return index === 0 ? `${bytes} B` : `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
    }
}
