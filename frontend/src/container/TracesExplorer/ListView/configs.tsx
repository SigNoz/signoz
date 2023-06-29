import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const defaultSelectedColumns: string[] = [
	'name',
	'serviceName',
	'responseStatusCode',
	'httpMethod',
	'durationNano',
];

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];
