import { TopOperationList } from '../TopOperationsTable';

interface TopOperation {
	numCalls: number;
	errorCount: number;
}

export const getTopOperationList = ({
	errorCount,
	numCalls,
}: TopOperation): TopOperationList =>
	({
		p50: 0,
		errorCount,
		name: 'test',
		numCalls,
		p95: 0,
		p99: 0,
	} as TopOperationList);
