import type { TelemetryFieldKey } from 'api/v5/v5';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

// Pinned timestamp column
export const TIMESTAMP_FIELD = {
	name: 'timestamp',
	fieldContext: 'span',
} as TelemetryFieldKey;

export const defaultSelectedColumns: TelemetryFieldKey[] = [
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
	},
	{
		name: 'http_method',
		signal: 'traces',
		fieldContext: 'span',
	},
	{
		name: 'response_status_code',
		signal: 'traces',
		fieldContext: 'span',
	},
	TIMESTAMP_FIELD,
];

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];
