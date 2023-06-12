import { TopOperationList } from './TopOperationsTable';

export const getErrorCount = (list: TopOperationList): number =>
	(list.errorCount / list.numCalls) * 100;
