import { TelemetryFieldKey } from 'api/v5/v5';
import { DataSource } from 'types/common/queryBuilder';

import { FontSize, OptionsQuery } from './types';
import { buildCompositeKey } from './utils';

export const URL_OPTIONS = 'options';

export const defaultOptionsQuery: OptionsQuery = {
	selectColumns: [],
	maxLines: 1,
	format: 'raw',
	fontSize: FontSize.SMALL,
};

export const EXCLUDED_COLUMNS: Record<DataSource, string[]> = {
	[DataSource.TRACES]: ['body', 'isRoot', 'isEntryPoint'],
	[DataSource.METRICS]: ['body'],
	[DataSource.LOGS]: [],
};

export const defaultLogsSelectedColumns: TelemetryFieldKey[] = [
	{
		name: 'timestamp',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: '',
		isIndexed: false,
	},
	{
		name: 'body',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: '',
		isIndexed: false,
	},
];

// Names that must always be present in logs selectColumns (writer invariant).
const LOGS_REQUIRED_COLUMN_NAMES = defaultLogsSelectedColumns.map(
	(c) => c.name,
);

// Composite keys (not bare names) so the picker locks ONLY the canonical
// `log.body`/`log.timestamp` — a same-name variant like `attribute.body` stays
// removable.
export const LOGS_REQUIRED_COLUMNS = defaultLogsSelectedColumns.map((c) =>
	buildCompositeKey(c.name, c.fieldContext),
);

// Drop composite-key duplicates (never legitimate — they only come from
// corrupted state). Returns the same array reference when nothing to dedupe.
export function dedupeColumnsByCompositeKey(
	columns: TelemetryFieldKey[],
): TelemetryFieldKey[] {
	const seen = new Set<string>();
	let hasDuplicate = false;
	const deduped = columns.filter((c) => {
		const key = buildCompositeKey(c.name, c.fieldContext);
		if (seen.has(key)) {
			hasDuplicate = true;
			return false;
		}
		seen.add(key);
		return true;
	});
	return hasDuplicate ? deduped : columns;
}

// Logs selectColumns invariant: no composite-key duplicates, and body +
// timestamp always present. Applied at loader + writer boundaries.
export function ensureLogsRequiredColumns(
	columns: TelemetryFieldKey[],
): TelemetryFieldKey[] {
	const deduped = dedupeColumnsByCompositeKey(columns);
	const missing = LOGS_REQUIRED_COLUMN_NAMES.filter(
		(name) => !deduped.some((c) => c.name === name),
	);
	if (missing.length === 0) {
		return deduped;
	}
	const defaultsByName = new Map(
		defaultLogsSelectedColumns.map((c) => [c.name, c]),
	);
	const prepended = missing
		.map((name) => defaultsByName.get(name))
		.filter((c): c is TelemetryFieldKey => c !== undefined);
	return [...prepended, ...deduped];
}

export const defaultTraceSelectedColumns: TelemetryFieldKey[] = [
	{
		name: 'service.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'name',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'duration_nano',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: '',
	},
	{
		name: 'http_method',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: '',
	},
	{
		name: 'response_status_code',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: '',
	},
];
