import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export const verifyFiltersAndOrderBy = (queryData: IBuilderQuery): void => {
	// Verify that the 'id' filter is not present in the pagination query
	const idFilter = queryData.filters?.items?.find(
		(item) => item?.key?.key === 'id',
	);
	expect(idFilter).toBeUndefined();

	// Verify the sorting order includes 'id' if 'timestamp' is present
	const orderByTimestamp = queryData.orderBy?.find(
		(item) => item.columnName === 'timestamp',
	);
	const orderById = queryData.orderBy?.find((item) => item.columnName === 'id');

	if (orderByTimestamp) {
		expect(orderById).toBeDefined();
		expect(orderById?.order).toBe(orderByTimestamp.order);
	}
};
