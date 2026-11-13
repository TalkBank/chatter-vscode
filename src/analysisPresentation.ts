/** Presentation consumes admitted JSON and carries one prepared traversal forward. */
import type { Schema } from 'effect';

export type AnalysisCell = null | string | number | boolean;
export type AnalysisColumn =
    | { readonly kind: 'text'; readonly key: string }
    | { readonly kind: 'numeric'; readonly key: string; readonly maximum: number };

export interface AnalysisTable {
    readonly title: string;
    readonly columns: readonly AnalysisColumn[];
    readonly rows: readonly Readonly<Record<string, AnalysisCell>>[];
}

/** Private construction prevents nested objects from reaching scalar table cells. */
export class AnalysisPresentation {
    private constructor(readonly tables: readonly AnalysisTable[]) {}

    static prepare(data: Schema.JsonObject): AnalysisPresentation {
        const tables: AnalysisTable[] = [];

        function visit(title: string, value: Schema.Json): void {
            const rows: Record<string, AnalysisCell>[] = [];
            const columns = new Map<string, AnalysisColumn>();

            function cell(row: Record<string, AnalysisCell>, key: string, value: AnalysisCell): void {
                row[key] = value;
                const previous = columns.get(key);
                if (typeof value === 'number' && previous?.kind !== 'text') {
                    columns.set(key, {
                        kind: 'numeric', key,
                        maximum: Math.max(previous?.maximum ?? value, value),
                    });
                } else if (value !== null || previous === undefined) {
                    columns.set(key, { kind: 'text', key });
                }
            }

            function record(label: string, input: Schema.JsonObject): void {
                const row: Record<string, AnalysisCell> = Object.create(null);
                for (const [key, item] of Object.entries(input)) {
                    if (typeof item === 'object' && item !== null) {
                        visit(`${label} / ${key}`, item);
                    } else {
                        cell(row, key, item);
                    }
                }
                if (Object.keys(row).length > 0) { rows.push(row); }
            }

            if (isJsonArray(value)) {
                for (const [index, item] of value.entries()) {
                    if (isJsonArray(item)) {
                        visit(`${title} / ${index + 1}`, item);
                    } else if (typeof item === 'object' && item !== null) {
                        const label = typeof item.speaker === 'string' ? item.speaker : String(index + 1);
                        record(`${title} / ${label}`, item);
                    } else {
                        const row: Record<string, AnalysisCell> = Object.create(null);
                        cell(row, 'value', item);
                        rows.push(row);
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                record(title, value);
            } else {
                const row: Record<string, AnalysisCell> = Object.create(null);
                cell(row, 'value', value);
                rows.push(row);
            }
            if (rows.length > 0) {
                tables.push({ title, columns: [...columns.values()], rows });
            }
        }

        for (const [title, value] of Object.entries(data)) { visit(title, value); }
        return new AnalysisPresentation(tables);
    }
}

/** JavaScript's array guard also admits readonly JSON arrays. */
function isJsonArray(value: Schema.Json): value is Schema.JsonArray {
    return Array.isArray(value);
}
