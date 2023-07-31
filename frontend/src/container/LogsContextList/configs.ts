import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

export const INITIAL_PAGE_SIZE = 5;
export const LOGS_MORE_PAGE_SIZE = 10;

export const getOrderByTimestamp = (order: string): OrderByPayload => ({
	columnName: 'timestamp',
	order,
});
