import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const defaultSelectedColumns: string[] = [
	'serviceName',
	'name',
	'durationNano',
	'httpMethod',
	'responseStatusCode',
];

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];
