import { TopOperationList } from './TopOperationsTable';

export const getErrorRate = (list: TopOperationList): number =>
	(list.errorCount / list.numCalls) * 100;
