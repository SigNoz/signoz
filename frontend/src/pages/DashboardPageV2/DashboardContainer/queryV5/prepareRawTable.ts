import {
	type Querybuildertypesv5RawDataDTO,
	TelemetrytypesSignalDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isPlainObject } from 'lodash-es';

/** A raw record flattened for the antd Table: `data` keys + `timestamp` lifted, plus a synthetic antd `key`. */
export type RawTableRow = Record<string, unknown> & { key: number };

/** A `raw`/`trace` result prepared for the List renderer. */
export interface RawTable {
	/** Display column ids, in render order (timestamp first when present). */
	columns: string[];
	rows: RawTableRow[];
	/** Next-page cursor from the V5 response; not consumed yet (rows page client-side). */
	nextCursor?: string;
}

const TIMESTAMP_COLUMN = 'timestamp';

interface PrepareRawTableArgs {
	/** `raw`/`trace` results from `getRawResults`. */
	results: Querybuildertypesv5RawDataDTO[];
	/** The panel's chosen columns; when empty, columns are derived from the rows. */
	selectFields: TelemetrytypesTelemetryFieldKeyDTO[];
	/**
	 * Panel telemetry signal. `logs`/`traces` flatten nested attribute/resource
	 * maps one level so selected fields (e.g. `service.name`) resolve (V1
	 * `FlatLogData` parity). Absent on the derive-columns fallback.
	 */
	signal?: TelemetrytypesSignalDTO;
}

/**
 * Lift object-valued keys' children to the top level so selected fields like
 * `service.name` (nested under `resources_string`) resolve to a column (V1
 * `FlatLogData` parity). Original maps are kept for the log-detail drawer.
 */
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

/**
 * Union of every row's scalar keys (first-seen order) — the fallback columns when
 * the panel hasn't picked fields. Nested maps are excluded; their children are
 * surfaced as lifted top-level columns instead.
 */
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

	// Logs and traces both nest resource/attribute maps; lift them so selected
	// fields like `service.name` resolve to a column (V1 parity).
	const shouldFlatten =
		signal === TelemetrytypesSignalDTO.logs ||
		signal === TelemetrytypesSignalDTO.traces;
	const rows: RawTableRow[] = result.rows.map((row, index) => {
		const data = row.data ?? {};
		return {
			key: index,
			...(row.timestamp ? { [TIMESTAMP_COLUMN]: row.timestamp } : {}),
			...(shouldFlatten ? flattenAttributes(data) : data),
		};
	});

	const selected = selectFields.map((field) => field.name).filter(Boolean);
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
