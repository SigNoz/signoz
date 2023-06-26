export enum ColumnTitle {
	Application = 'Application',
	P99 = 'P99 latency (in ms)',
	ErrorRate = 'Error Rate (% of total)',
	Operations = 'Operations Per Second',
}

export enum ColumnDataIndex {
	Application = 'serviceName',
	P99 = 'p99',
	ErrorRate = 'errorRate',
	Operations = 'callRate',
}

export enum ColumnKey {
	Application = 'serviceName',
	P99 = 'p99',
	ErrorRate = 'errorRate',
	Operations = 'callRate',
}

export enum ColumnWidth {
	Application = 200,
	P99 = 150,
	ErrorRate = 150,
	Operations = 150,
}

export const SORTING_ORDER = 'descend';
