import { Form } from 'antd';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { server } from 'mocks-server/server';
import { act, render, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import type {
	BaseBuilderQuery,
	QueryRangePayloadV5,
} from 'types/api/v5/queryRange';

import { pipelineFields } from '../../../../config';
import { queryRangeV5Handler } from '../../../../Preview/__tests__/fixtures';
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
	it('previews sample logs for the picked filter', async () => {
		const requests: QueryRangePayloadV5[] = [];
		server.use(queryRangeV5Handler({ rows: [], count: 0, requests }));

		render(<Form>{filterField && <FilterInput fieldData={filterField} />}</Form>);

		const { onChange } = jest.mocked(QueryBuilderSearchV2).mock.calls[0][0];
		act(() => onChange(v5Filter));

		await waitFor(() =>
			expect(
				requests
					.filter((request) => request.requestType === 'raw')
					.map(
						(request) =>
							(request.compositeQuery.queries[0].spec as BaseBuilderQuery).filter
								?.expression,
					),
			).toContain("http.method = 'GET' AND severity_text = 'ERROR'"),
		);
	});
});
