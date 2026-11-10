import type { TelemetryFieldKey } from 'api/v5/v5';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const defaultSelectedColumns: string[] = [
	'service.name',
	'name',
	'duration_nano',
	'http_method',
	'response_status_code',
	'timestamp',
];

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

// Pinned timestamp column
export const TIMESTAMP_FIELD = {
	name: 'timestamp',
	fieldContext: 'span',
} as TelemetryFieldKey;
