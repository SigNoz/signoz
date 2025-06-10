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
	useLocation: (): { search: string; pathname: string } => ({
		pathname: ROUTES.LOGS_EXPLORER,
		search:
			'?compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522dataSource%2522%253A%2522logs%2522%252C%2522queryName%2522%253A%2522A%2522%252C%2522aggregateOperator%2522%253A%2522noop%2522%252C%2522aggregateAttribute%2522%253A%257B%2522id%2522%253A%2522------%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522key%2522%253A%2522%2522%252C%2522isColumn%2522%253Afalse%252C%2522type%2522%253A%2522%2522%252C%2522isJSON%2522%253Afalse%257D%252C%2522timeAggregation%2522%253A%2522rate%2522%252C%2522spaceAggregation%2522%253A%2522sum%2522%252C%2522functions%2522%253A%255B%255D%252C%2522filters%2522%253A%257B%2522items%2522%253A%255B%255D%252C%2522op%2522%253A%2522AND%2522%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522stepInterval%2522%253A60%252C%2522having%2522%253A%255B%255D%252C%2522limit%2522%253Anull%252C%2522orderBy%2522%253A%255B%257B%2522columnName%2522%253A%2522timestamp%2522%252C%2522order%2522%253A%2522desc%2522%257D%255D%252C%2522groupBy%2522%253A%255B%255D%252C%2522legend%2522%253A%2522%2522%252C%2522reduceTo%2522%253A%2522avg%2522%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%252C%2522promql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522query%2522%253A%2522%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%257D%255D%252C%2522clickhouse_sql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%252C%2522query%2522%253A%2522%2522%257D%255D%252C%2522id%2522%253A%25220d764438-8023-44b9-9bab-2f05012eca7b%2522%257D&options=%7B%22selectColumns%22%3A%5B%7B%22key%22%3A%22timestamp%22%2C%22dataType%22%3A%22string%22%2C%22type%22%3A%22tag%22%2C%22isColumn%22%3Atrue%2C%22isJSON%22%3Afalse%2C%22id%22%3A%22timestamp--string--tag--true%22%2C%22isIndexed%22%3Afalse%7D%2C%7B%22key%22%3A%22body%22%2C%22dataType%22%3A%22string%22%2C%22type%22%3A%22tag%22%2C%22isColumn%22%3Atrue%2C%22isJSON%22%3Afalse%2C%22id%22%3A%22body--string--tag--true%22%2C%22isIndexed%22%3Afalse%7D%5D%2C%22maxLines%22%3A2%2C%22format%22%3A%22raw%22%2C%22fontSize%22%3A%22small%22%2C%22version%22%3A1%7D',
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

const checkAutoRefreshButtonsPresent = async (
	getByRole: (role: string, options?: any) => HTMLElement,
): Promise<void> => {
	await waitFor(() => {
		expect(
			getByRole('button', {
				name: /sync/i,
			}),
		).toBeInTheDocument();

		expect(
			getByRole('button', {
				name: /caret-down/i,
			}),
		).toBeInTheDocument();
	});
};

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

	test.each([
		{ panelType: PANEL_TYPES.LIST, viewName: 'list view' },
		{ panelType: PANEL_TYPES.TIME_SERIES, viewName: 'time series view' },
		{ panelType: PANEL_TYPES.TABLE, viewName: 'table view' },
	])(
		'check that auto refresh is present in $viewName',
		async ({ panelType }) => {
			const { getByRole } = render(
				<QueryBuilderContext.Provider
					value={{
						isDefaultQuery: (): boolean => false,
						currentQuery: {
							...initialQueriesMap.logs,
							builder: {
								...initialQueriesMap.logs.builder,
								queryData: [initialQueryBuilderFormValues],
							},
						},
						setSupersetQuery: jest.fn(),
						supersetQuery: initialQueriesMap.logs,
						stagedQuery: initialQueriesMap.logs,
						initialDataSource: null,
						panelType,
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
						updateAllQueriesOperators: (): Query => initialQueriesMap.logs,
						updateQueriesData: (): Query => initialQueriesMap.logs,
						initQueryBuilderData: noop,
						handleOnUnitsChange: noop,
						isStagedQueryUpdated: (): boolean => false,
					}}
				>
					<LogsExplorer />
				</QueryBuilderContext.Provider>,
			);

			await checkAutoRefreshButtonsPresent(getByRole);
		},
	);
});
