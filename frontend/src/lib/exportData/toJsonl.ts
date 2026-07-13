import { SerializedTable } from './types';

/** Serializes a table to newline-delimited JSON: one object per row, keyed by header. */
export function toJsonl(table: SerializedTable): string {
	return table.rows
		.map((row) =>
			JSON.stringify(
				Object.fromEntries(table.headers.map((header, i) => [header, row[i]])),
			),
		)
		.join('\n');
}
