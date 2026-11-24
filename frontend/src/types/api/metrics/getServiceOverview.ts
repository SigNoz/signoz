export interface ServiceOverview {
	callRate: number;
	errorRate: number;
	numCalls: number;
	numErrors: number;
	p50: number;
	p95: number;
	p99: number;
	timestamp: number;
}
