import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

export const PAGE_SIZE = 5;

export const getOrderByTimestamp = (order: string): OrderByPayload => ({
	columnName: 'timestamp',
	order,
});
