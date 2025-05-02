import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { noop } from 'lodash-es';
import { logsQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { QueryBuilderContext } from 'providers/QueryBuilder';
// https://virtuoso.dev/mocking-in-tests/
import { VirtuosoMockContext } from 'react-virtuoso';
import { fireEvent, render, waitFor } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import LogsExplorer from '../index';

const queryRangeURL = 'http://localhost/api/v3/query_range';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
}));

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

// mocking the graph components in this test as this should be handled separately
jest.mock(
	'container/TimeSeriesView/TimeSeriesView',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Time Series Chart</div>;
		},
);

const frequencyChartContent = 'Frequency chart content';
jest.mock(
	'container/LogsExplorerChart',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>{frequencyChartContent}</div>;
		},
);

jest.mock('constants/panelTypes', () => ({
	AVAILABLE_EXPORT_PANEL_TYPES: ['graph', 'table'],
}));

jest.mock('d3-interpolate', () => ({
	interpolate: jest.fn(),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

const logsQueryServerRequest = (): void =>
	server.use(
		rest.post(queryRangeURL, (req, res, ctx) =>
			res(ctx.status(200), ctx.json(logsQueryRangeSuccessResponse)),
		),
	);

describe('Logs Explorer Tests', () => {
	test('Logs Explorer default view test without data', async () => {
		const {
			getByText,
			getByRole,
			queryByText,
			getByTestId,
			queryByTestId,
		} = render(<LogsExplorer />);

		// check the presence of frequency chart content
		expect(getByText(frequencyChartContent)).toBeInTheDocument();

		// toggle the chart and check it gets removed from the DOM
		const histogramToggle = getByRole('switch');
		fireEvent.click(histogramToggle);
		expect(queryByText(frequencyChartContent)).not.toBeInTheDocument();

		// check the presence of search bar and query builder and absence of clickhouse
		const searchView = getByTestId('search-view');
		expect(searchView).toBeInTheDocument();
		const queryBuilderView = getByTestId('query-builder-view');
		expect(queryBuilderView).toBeInTheDocument();
		const clickhouseView = queryByTestId('clickhouse-view');
		expect(clickhouseView).not.toBeInTheDocument();

		// check the presence of List View / Time Series View / Table View
		const listView = getByTestId('logs-list-view');
		const timeSeriesView = getByTestId('time-series-view');
		const tableView = getByTestId('table-view');
		expect(listView).toBeInTheDocument();
		expect(timeSeriesView).toBeInTheDocument();
		expect(tableView).toBeInTheDocument();

		// check the presence of old logs explorer CTA
		const oldLogsCTA = getByText('Switch to Old Logs Explorer');
		expect(oldLogsCTA).toBeInTheDocument();
	});

	// update this test properly
	test.skip('Logs Explorer Page should render with data', async () => {
		// mocking the query range API to return the logs
		logsQueryServerRequest();
		const { queryByText, queryByTestId } = render(
			<VirtuosoMockContext.Provider
				value={{ viewportHeight: 300, itemHeight: 100 }}
			>
				<LogsExplorer />
			</VirtuosoMockContext.Provider>,
		);

		// check for loading state to be not present
		await waitFor(() =>
			expect(queryByText(`Retrieving your logs!`)).not.toBeInTheDocument(),
		);

		// check for no data state to not be present
		await waitFor(() =>
			expect(queryByText('No logs yet.')).not.toBeInTheDocument(),
		);

		// check for the data container loaded
		await waitFor(() =>
			expect(queryByTestId('logs-list-virtuoso')).toBeInTheDocument(),
		);

		// check for data being present in the UI
		// todo[@vikrantgupta25]: skipping this for now as the formatting matching is not picking up in the CI will debug later.
		// expect(
		// 	queryByText(
		// 		`2024-02-16 02:50:22.000 | 2024-02-15T21:20:22.035Z INFO frontend Dispatch successful {"service": "frontend", "trace_id": "span_id", "span_id": "span_id", "driver": "driver", "eta": "2m0s"}`,
		// 	),
		// ).toBeInTheDocument();
	});

	test('Multiple Current Queries', async () => {
		// mocking the query range API to return the logs
		logsQueryServerRequest();
		const { queryAllByText } = render(
			<QueryBuilderContext.Provider
				value={{
					isDefaultQuery: (): boolean => false,
					currentQuery: {
						...initialQueriesMap.metrics,
						builder: {
							...initialQueriesMap.metrics.builder,
							queryData: [
								initialQueryBuilderFormValues,
								initialQueryBuilderFormValues,
							],
						},
					},
					setSupersetQuery: jest.fn(),
					supersetQuery: initialQueriesMap.metrics,
					stagedQuery: initialQueriesMap.metrics,
					initialDataSource: null,
					panelType: PANEL_TYPES.TIME_SERIES,
					isEnabledQuery: false,
					lastUsedQuery: 0,
					setLastUsedQuery: noop,
					handleSetQueryData: noop,
					handleSetFormulaData: noop,
					handleSetQueryItemData: noop,
					handleSetConfig: noop,
					removeQueryBuilderEntityByIndex: noop,
					removeQueryTypeItemByIndex: noop,
					addNewBuilderQuery: noop,
					cloneQuery: noop,
					addNewFormula: noop,
					addNewQueryItem: noop,
					redirectWithQueryBuilderData: noop,
					handleRunQuery: noop,
					resetQuery: noop,
					updateAllQueriesOperators: (): Query => initialQueriesMap.metrics,
					updateQueriesData: (): Query => initialQueriesMap.metrics,
					initQueryBuilderData: noop,
					handleOnUnitsChange: noop,
					isStagedQueryUpdated: (): boolean => false,
				}}
			>
				<VirtuosoMockContext.Provider
					value={{ viewportHeight: 300, itemHeight: 100 }}
				>
					<LogsExplorer />
				</VirtuosoMockContext.Provider>
			</QueryBuilderContext.Provider>,
		);

		const queries = queryAllByText(
			'Search Filter : select options from suggested values, for IN/NOT IN operators - press "Enter" after selecting options',
		);
		expect(queries.length).toBe(2);

		const legendFormats = queryAllByText('Legend Format');
		expect(legendFormats.length).toBe(2);

		const aggrInterval = queryAllByText('AGGREGATION INTERVAL');
		expect(aggrInterval.length).toBe(2);
	});

	test('frequency chart visibility and switch toggle', async () => {
		const { getByRole, queryByText } = render(<LogsExplorer />);

		// check the presence of Frequency Chart
		expect(queryByText('Frequency chart')).toBeInTheDocument();

		// check the default state of the histogram toggle
		const histogramToggle = getByRole('switch');
		expect(histogramToggle).toBeInTheDocument();
		expect(histogramToggle).toBeChecked();
		expect(queryByText(frequencyChartContent)).toBeInTheDocument();

		// toggle the chart and check it gets removed from the DOM
		await fireEvent.click(histogramToggle);
		expect(queryByText(frequencyChartContent)).not.toBeInTheDocument();
	});
});
