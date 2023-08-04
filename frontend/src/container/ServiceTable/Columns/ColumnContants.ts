export enum ColumnKey {
	Application = 'serviceName',
	P99 = 'p99',
	ErrorRate = 'errorRate',
	Operations = 'callRate',
}

export const ColumnTitle: Record<ColumnKey, string> = {
	[ColumnKey.Application]: 'Application',
	[ColumnKey.P99]: 'P99 latency (in ms)',
	[ColumnKey.ErrorRate]: 'Error Rate (% of total)',
	[ColumnKey.Operations]: 'Operations Per Second',
};

export enum ColumnWidth {
	Application = 200,
	P99 = 150,
	ErrorRate = 150,
	Operations = 150,
}

export const SORTING_ORDER = 'descend';

export const SEARCH_PLACEHOLDER = 'Search by service';
