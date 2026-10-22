/** Format-agnostic tabular result produced by every exporter. Consumed by the
 * CSV/JSONL formatters */
export interface SerializedTable {
	headers: string[];
	// One entry per header, in header order. Empty string marks a gap.
	rows: (string | number)[][];
}

/** File formats a client-side export can be downloaded as. */
export enum ExportFormat {
	Csv = 'csv',
	Jsonl = 'jsonl',
}
