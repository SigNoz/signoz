import { ENVIRONMENT } from 'constants/env';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render } from 'tests/test-utils';

import TracesView from '../index';

export const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;

export const groupedRows = [
	{
		timestamp: '2024-07-19T08:39:58.735245Z',
		data: {
			'service.name': 'frontend',
			name: 'HTTP GET',
			duration_nano: 55306000,
			span_count: 8,
			trace_id: '0000000000000000344ded1387b08a7e',
		},
	},
	{
		timestamp: '2024-07-19T08:39:59.949129915Z',
		data: {
			'service.name': 'demo-app',
			// intentionally empty to assert the "-" cell
			name: '',
			duration_nano: 790949390,
			span_count: 3,
			trace_id: 'a364a8e15af3e9a8c866e0528db8b637',
		},
	},
];

export const groupedResponse = (rows: unknown[]): Record<string, unknown> => ({
	data: { type: 'trace', data: { results: [{ queryName: 'A', rows }] } },
});

export const renderTracesView = (
	props: Record<string, unknown> = {},
): ReturnType<typeof render> =>
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 500, itemHeight: 54 }}>
			<TracesView
				isFilterApplied={false}
				setWarning={jest.fn()}
				setIsLoadingQueries={jest.fn()}
				{...props}
			/>
		</VirtuosoMockContext.Provider>,
		{},
		{
			initialRoute: '/traces-explorer',
			queryBuilderOverrides: {
				panelType: PANEL_TYPES.TRACE,
				stagedQuery: initialQueriesMap.traces,
				currentQuery: initialQueriesMap.traces,
			} as any,
		},
	);
