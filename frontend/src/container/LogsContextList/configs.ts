import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

export const INITIAL_PAGE_SIZE = 10;
export const INITIAL_PAGE_SIZE_SMALL_FONT = 12;
export const LOGS_MORE_PAGE_SIZE = 10;

export const getOrderByTimestamp = (order: string): OrderByPayload => ({
	columnName: 'timestamp',
	order,
});
