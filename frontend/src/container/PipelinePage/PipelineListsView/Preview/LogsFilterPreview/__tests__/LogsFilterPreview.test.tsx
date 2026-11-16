import { server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { BaseBuilderQuery, QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import { queryRangeV5Handler } from '../../__tests__/fixtures';
import LogsFilterPreview from '../index';

const filter: TagFilter = {
	op: 'AND',
	items: [
		{
			id: 'code-function',
			key: { key: 'code.function', dataType: DataTypes.String, type: 'tag' },
			op: '=',
			value: 'PlaceOrder',
		},
	],
};

describe('LogsFilterPreview', () => {
	it('loads the sample logs and the match count from query_range v5', async () => {
		const requests: QueryRangePayloadV5[] = [];
		server.use(
			queryRangeV5Handler({
				rows: [
					{
						timestamp: '2026-11-16T10:00:02Z',
						data: { id: 'log-2', body: 'order placed' },
					},
					{
						timestamp: '2026-11-16T10:00:01Z',
						data: { id: 'log-1', body: 'payment charged' },
					},
				],
				count: 4213,
				requests,
			}),
		);

		render(<LogsFilterPreview filter={filter} />);

		await expect(
			screen.findByTestId('pipeline-filter-preview-count'),
		).resolves.toHaveTextContent('4213 matches in');
		await expect(
			screen.findAllByTestId('pipeline-preview-log'),
		).resolves.toHaveLength(2);

		const specOf = (requestType: string): BaseBuilderQuery | undefined =>
			requests.find((request) => request.requestType === requestType)
				?.compositeQuery.queries[0].spec as BaseBuilderQuery | undefined;

		expect(specOf('raw')).toMatchObject({
			filter: { expression: "code.function = 'PlaceOrder'" },
			limit: 5,
			order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
		});
		expect(specOf('scalar')?.filter?.expression).toBe(
			"code.function = 'PlaceOrder'",
		);
	});
});
