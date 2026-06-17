import type {
	Querybuildertypesv5RawDataDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * One raw record flattened for the antd Table: the record's `data` keys spread
 * to the top level, the row `timestamp` lifted alongside them, and a synthetic
 * `key` for antd. Mirrors how the scalar prep shapes Table rows.
 */
export type RawTableRow = Record<string, unknown> & { key: number };

/** A `raw`/`trace` result prepared for the List renderer. */
export interface RawTable {
	/** Display column ids, in render order (timestamp first when present). */
	columns: string[];
	rows: RawTableRow[];
	/**
	 * Cursor for the next page from the V5 response. Threaded through for the
	 * future server-side pagination path; the current renderer pages rows
	 * client-side and does not consume it yet.
	 */
	nextCursor?: string;
}

const TIMESTAMP_COLUMN = 'timestamp';

interface PrepareRawTableArgs {
	/** `raw`/`trace` results from `getRawResults`. */
	results: Querybuildertypesv5RawDataDTO[];
	/** The panel's chosen columns; when empty, columns are derived from the rows. */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	/**
	 * Panel telemetry signal. For `logs`, nested attribute/resource maps in the
	 * row data are flattened one level so selected fields (e.g. `service.name`,
	 * which the backend nests under `resources_string`) resolve to a top-level
	 * column — V1 `FlatLogData` parity. Traces return flat data, so they're left
	 * as-is.
	 */
	signal?: string;
}

// Lift the children of object-valued keys to the top level (one level deep),
// keyed by child name, so selected fields like `service.name` (nested under
// `resources_string`) resolve to a column — mirrors V1 `FlatLogData`. The
// original maps are RETAINED on the row (deriveColumns skips them) so the log
// detail drawer still gets the structured `resources_string`/`attributes_*`.
// Later keys win on collision, matching V1's last-write-wins flatten.
function flattenAttributes(
	data: Record<string, unknown>,
): Record<string, unknown> {
	const flat: Record<string, unknown> = { ...data };
	Object.keys(data).forEach((key) => {
		const value = data[key];
		if (isPlainObject(value)) {
			Object.assign(flat, value as Record<string, unknown>);
		}
	});
	return flat;
}

function isPlainObject(value: unknown): boolean {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Union of every row's keys (minus the synthetic antd `key`), first-seen order
// preserved — the fallback column set when the panel hasn't picked fields. The
// retained nested maps (resources_string, attributes_*, …) are object-valued and
// excluded: their scalar children are surfaced as lifted top-level columns instead.
function deriveColumns(rows: RawTableRow[]): string[] {
	const seen = new Set<string>();
	rows.forEach((row) => {
		Object.keys(row).forEach((key) => {
			if (key === 'key' || isPlainObject((row as Record<string, unknown>)[key])) {
				return;
			}
			seen.add(key);
		});
	});
	return [...seen];
}

/**
 * Flattens a V5 `raw`/`trace` response into rows + ordered columns for the List
 * panel. A raw query returns one result per query, so the first result with rows
 * is the panel's data. Columns come from the panel's `selectFields` when set,
 * otherwise from the union of the rows' keys; `timestamp` is always surfaced
 * first when the rows carry it. Returns `undefined` when there's nothing to show.
 */
export function prepareRawTable({
	results,
	selectFields,
	signal,
}: PrepareRawTableArgs): RawTable | undefined {
	const result = results.find((candidate) => (candidate.rows?.length ?? 0) > 0);
	if (!result?.rows) {
		return undefined;
	}

	const shouldFlatten = signal === 'logs';
	const rows: RawTableRow[] = result.rows.map((row, index) => {
		const data = row.data ?? {};
		return {
			key: index,
			...(row.timestamp ? { [TIMESTAMP_COLUMN]: row.timestamp } : {}),
			...(shouldFlatten ? flattenAttributes(data) : data),
		};
	});

	const selected = (selectFields ?? [])
		.map((field) => field.name)
		.filter(Boolean);
	const columns = selected.length > 0 ? selected : deriveColumns(rows);

	const withoutTimestamp = columns.filter(
		(column) => column !== TIMESTAMP_COLUMN,
	);
	const hasTimestamp = rows.some((row) => row[TIMESTAMP_COLUMN] != null);
	const ordered = hasTimestamp
		? [TIMESTAMP_COLUMN, ...withoutTimestamp]
		: withoutTimestamp;

	return { columns: ordered, rows, nextCursor: result.nextCursor };
}
