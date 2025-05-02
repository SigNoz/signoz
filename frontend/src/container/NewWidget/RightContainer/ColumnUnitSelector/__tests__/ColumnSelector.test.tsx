import ROUTES from 'constants/routes';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import { useLocation } from 'react-router-dom';
import { render } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { ColumnUnitSelector } from '../ColumnUnitSelector';

const compositeQueryParam = {
	queryType: 'builder',
	builder: {
		queryData: [
			{
				dataSource: 'metrics',
				queryName: 'A',
				aggregateOperator: 'count',
				aggregateAttribute: {
					key: 'signoz_latency',
					dataType: 'float64',
					type: 'ExponentialHistogram',
					isColumn: true,
					isJSON: false,
					id: 'signoz_latency--float64--ExponentialHistogram--true',
				},
				timeAggregation: '',
				spaceAggregation: 'p90',
				functions: [],
				filters: {
					items: [],
					op: 'AND',
				},
				expression: 'A',
				disabled: false,
				stepInterval: 60,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [
					{
						key: 'service_name',
						dataType: 'string',
						type: 'tag',
						isColumn: false,
						isJSON: false,
						id: 'service_name--string--tag--false',
					},
				],
				legend: '',
				reduceTo: 'avg',
			},
		],
		queryFormulas: [
			{
				queryName: 'F1',
				expression: 'A * 10',
				disabled: false,
				legend: '',
			},
		],
	},
	promql: [
		{
			name: 'A',
			query: '',
			legend: '',
			disabled: false,
		},
	],
	clickhouse_sql: [
		{
			name: 'A',
			legend: '',
			disabled: false,
			query: '',
		},
	],
	id: '12e1d311-cb47-4b76-af68-65d8e85c9e0d',
};

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
	useRouteMatch: jest.fn(),
}));

jest.mock('hooks/queryBuilder/useGetCompositeQueryParam', () => ({
	useGetCompositeQueryParam: (): Query => compositeQueryParam as Query,
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('Column unit selector panel unit test', () => {
	it('unit selectors should be rendered for queries and formula', () => {
		const mockLocation = {
			pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.DASHBOARD_WIDGET}/`,
		};
		(useLocation as jest.Mock).mockReturnValue(mockLocation);
		const { getByText } = render(
			<QueryBuilderProvider>
				<ColumnUnitSelector columnUnits={{}} setColumnUnits={(): void => {}} />,
			</QueryBuilderProvider>,
		);

		expect(getByText('F1')).toBeInTheDocument();
		expect(getByText('A')).toBeInTheDocument();
	});
});
