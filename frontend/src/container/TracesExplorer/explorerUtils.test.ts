import { initialQueriesMap } from 'constants/queryBuilder';
import { cloneDeep } from 'lodash-es';

import { withRootSpanFilter } from './explorerUtils';

describe('withRootSpanFilter', () => {
	it('adds isRoot=true filter to the default traces query', () => {
		const query = withRootSpanFilter(cloneDeep(initialQueriesMap.traces));

		expect(query.builder.queryData[0].filters?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ key: 'isRoot' }),
					op: '=',
					value: 'true',
				}),
			]),
		);
	});

	it('does not duplicate isRoot when already present', () => {
		const query = withRootSpanFilter(cloneDeep(initialQueriesMap.traces));
		const withDuplicate = withRootSpanFilter(cloneDeep(query));

		const rootFilters = withDuplicate.builder.queryData[0].filters?.items.filter(
			(filter) => filter.key?.key === 'isRoot',
		);

		expect(rootFilters).toHaveLength(1);
	});
});
