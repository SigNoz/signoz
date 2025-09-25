/* eslint-disable sonarjs/no-duplicate-string */
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
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { MemoryRouter } from 'react-router-dom-v5-compat';
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

// Mock usePreferenceSync
jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): any => ({
		preferences: {
			columns: [],
			formatting: {
				maxLines: 2,
				format: 'table',
				fontSize: 'small',
				version: 1,
			},
		},
		loading: false,
		error: null,
		updateColumns: jest.fn(),
		updateFormatting: jest.fn(),
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
			getByRole,
			queryByText,
			getByTestId,
			queryByTestId,
			container,
		} = render(
			<MemoryRouter
				initialEntries={[
					'/logs-explorer/?panelType=list&selectedExplorerView=list',
				]}
			>
				<PreferenceContextProvider>
					<LogsExplorer />
				</PreferenceContextProvider>
			</MemoryRouter>,
		);

		// by default is hidden, toggle the chart and check it's visibility
		const histogramToggle = getByRole('switch');
		fireEvent.click(histogramToggle);
		expect(queryByText(frequencyChartContent)).toBeInTheDocument();

		// check the presence of search bar and query builder and absence of clickhouse
		const searchView = getByTestId('search-view');
		expect(searchView).toBeInTheDocument();
		const queryBuilderView = getByTestId('query-builder-view');
		expect(queryBuilderView).toBeInTheDocument();
		const clickhouseView = queryByTestId('clickhouse-view');
		expect(clickhouseView).not.toBeInTheDocument();

		// check the presence of List View / Time Series View / Table View using class names
		const listViewTab = container.querySelector(
			'.list-view-tab.explorer-view-option',
		);
		const timeSeriesViewTab = container.querySelector('.timeseries-view-tab');
		const tableViewTab = container.querySelector('.table-view-tab');
		expect(listViewTab).toBeInTheDocument();
		expect(timeSeriesViewTab).toBeInTheDocument();
		expect(tableViewTab).toBeInTheDocument();

		// // check the presence of old logs explorer CTA - TODO: add this once we have the header updated
		// const oldLogsCTA = getByText('Switch to Old Logs Explorer');
		// expect(oldLogsCTA).toBeInTheDocument();
	});

	// update this test properly
	test.skip('Logs Explorer Page should render with data', async () => {
		// mocking the query range API to return the logs
		logsQueryServerRequest();
		const { queryByText, queryByTestId } = render(
			<MemoryRouter
				initialEntries={[
					'/logs-explorer/?panelType=list&selectedExplorerView=list',
				]}
			>
				<PreferenceContextProvider>
					<VirtuosoMockContext.Provider
						value={{ viewportHeight: 300, itemHeight: 100 }}
					>
						<LogsExplorer />
					</VirtuosoMockContext.Provider>
				</PreferenceContextProvider>
			</MemoryRouter>,
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
			<MemoryRouter
				initialEntries={[
					'/logs-explorer/?panelType=list&selectedExplorerView=list',
				]}
			>
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
								queryTraceOperator: [],
							},
						},
						setSupersetQuery: jest.fn(),
						supersetQuery: initialQueriesMap.metrics,
						stagedQuery: initialQueriesMap.metrics,
						initialDataSource: null,
						panelType: PANEL_TYPES.TIME_SERIES,
						isEnabledQuery: false,
						lastUsedQuery: 0,
						handleSetTraceOperatorData: noop,
						removeAllQueryBuilderEntities: noop,
						removeTraceOperator: noop,
						addTraceOperator: noop,
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
					<PreferenceContextProvider>
						<VirtuosoMockContext.Provider
							value={{ viewportHeight: 300, itemHeight: 100 }}
						>
							<LogsExplorer />
						</VirtuosoMockContext.Provider>
					</PreferenceContextProvider>
				</QueryBuilderContext.Provider>
			</MemoryRouter>,
		);

		const queries = queryAllByText(
			"Enter your filter query (e.g., http.status_code >= 500 AND service.name = 'frontend')",
		);
		expect(queries.length).toBe(1);
	});

	test('frequency chart visibility and switch toggle', async () => {
		const { getByRole, queryByText } = render(
			<MemoryRouter
				initialEntries={[
					'/logs-explorer/?panelType=list&selectedExplorerView=list',
				]}
			>
				<PreferenceContextProvider>
					<LogsExplorer />
				</PreferenceContextProvider>
			</MemoryRouter>,
		);

		// check the presence of Frequency Chart
		expect(queryByText('Frequency chart')).toBeInTheDocument();

		// check the default state of the histogram toggle
		const histogramToggle = getByRole('switch');
		expect(histogramToggle).toBeInTheDocument();
		expect(histogramToggle).toBeChecked();

		// toggle the chart and check it gets removed from the DOM
		await fireEvent.click(histogramToggle);
		expect(histogramToggle).not.toBeChecked();
		expect(queryByText(frequencyChartContent)).not.toBeInTheDocument();
	});
});
