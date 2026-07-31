import { initialQueriesMap } from 'constants/queryBuilder';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';

import { DEFAULT_LIST_ORDER_BY, getListOrderBy } from '../explorerUtils';

const buildQuery = (orderBy: OrderByPayload[]): Query => {
	const baseQuery = initialQueriesMap.logs;

	return {
		...baseQuery,
		builder: {
			...baseQuery.builder,
			queryData: [{ ...baseQuery.builder.queryData[0], orderBy }],
		},
	};
};

describe('getListOrderBy', () => {
	it('falls back to the default order when there is no composite query', () => {
		expect(getListOrderBy(null)).toBe(DEFAULT_LIST_ORDER_BY);
	});

	it('falls back to the default order when the query carries no orderBy', () => {
		expect(getListOrderBy(buildQuery([]))).toBe(DEFAULT_LIST_ORDER_BY);
	});

	it('reads the order from the composite query', () => {
		expect(
			getListOrderBy(buildQuery([{ columnName: 'timestamp', order: 'asc' }])),
		).toBe('timestamp:asc');
	});

	it('supports ordering by a column other than timestamp', () => {
		expect(
			getListOrderBy(buildQuery([{ columnName: 'body', order: 'asc' }])),
		).toBe('body:asc');
	});

	it('normalises the order direction to lower case', () => {
		expect(
			getListOrderBy(buildQuery([{ columnName: 'timestamp', order: 'ASC' }])),
		).toBe('timestamp:asc');
	});

	it('falls back to the default order for an incomplete orderBy entry', () => {
		expect(
			getListOrderBy(buildQuery([{ columnName: 'timestamp' } as OrderByPayload])),
		).toBe(DEFAULT_LIST_ORDER_BY);
	});

	it('only considers the first orderBy entry', () => {
		expect(
			getListOrderBy(
				buildQuery([
					{ columnName: 'timestamp', order: 'asc' },
					{ columnName: 'id', order: 'desc' },
				]),
			),
		).toBe('timestamp:asc');
	});
});
