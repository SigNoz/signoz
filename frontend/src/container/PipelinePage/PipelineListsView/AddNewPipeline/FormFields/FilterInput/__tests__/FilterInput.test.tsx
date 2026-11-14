import { Form } from 'antd';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { rest, server } from 'mocks-server/server';
import { act, render, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import type {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import { pipelineFields } from '../../../../config';
import FilterInput from '..';

jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2',
	() => ({ __esModule: true, default: jest.fn(() => null) }),
);

const filterField = pipelineFields.find((field) => field.name === 'filter');

const v5Filter: TagFilter = {
	op: 'AND',
	items: [
		{
			id: 'attribute-pill',
			key: { key: 'http.method', dataType: DataTypes.String, type: 'attribute' },
			op: '=',
			value: 'GET',
		},
		{
			id: 'log-pill',
			key: { key: 'severity_text', dataType: DataTypes.String, type: 'log' },
			op: '=',
			value: 'ERROR',
		},
	],
};

describe('Pipeline FilterInput', () => {
	it('previews sample logs with the legacy key types the v3 logs builder reads', async () => {
		const previewFilters: TagFilter[] = [];
		server.use(
			rest.post('*/api/v3/query_range', async (req, res, ctx) => {
				const body: QueryRangePayload = await req.json();
				const query = body.compositeQuery.builderQueries?.A as IBuilderQuery;
				if (query.filters) {
					previewFilters.push(query.filters);
				}
				return res(ctx.status(200), ctx.json({ data: { result: [] } }));
			}),
		);

		render(<Form>{filterField && <FilterInput fieldData={filterField} />}</Form>);

		const { onChange } = jest.mocked(QueryBuilderSearchV2).mock.calls[0][0];
		act(() => onChange(v5Filter));

		await waitFor(() => expect(previewFilters).not.toHaveLength(0));
		expect(
			previewFilters[previewFilters.length - 1].items.map((item) => [
				item.key?.key,
				item.key?.type,
			]),
		).toStrictEqual([
			['http.method', 'tag'],
			['severity_text', ''],
		]);
	});
});
