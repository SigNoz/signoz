import { TelemetryFieldKey } from 'api/v5/v5';
import { DataSource } from 'types/common/queryBuilder';

import { FontSize, OptionsQuery } from './types';

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

const LOGS_REQUIRED_COLUMNS = ['timestamp', 'body'] as const;

/**
 * Always-on invariant: every logs selectColumns array must contain `body` and
 * `timestamp`. Applied at both loader and writer boundaries so the picker, the
 * table, and persisted state can never diverge into a "missing required
 * column" state.
 */
export function ensureLogsRequiredColumns(
	columns: TelemetryFieldKey[],
): TelemetryFieldKey[] {
	const missing = LOGS_REQUIRED_COLUMNS.filter(
		(name) => !columns.some((c) => c.name === name),
	);
	if (missing.length === 0) {
		return columns;
	}
	const defaultsByName = new Map(
		defaultLogsSelectedColumns.map((c) => [c.name, c]),
	);
	const prepended = missing
		.map((name) => defaultsByName.get(name))
		.filter((c): c is TelemetryFieldKey => c !== undefined);
	return [...prepended, ...columns];
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
