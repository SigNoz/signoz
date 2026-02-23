import { jest } from '@jest/globals';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { render, screen, userEvent } from 'tests/test-utils';
import {
	Having,
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import '@testing-library/jest-dom';

import { QueryBuilderV2 } from '../QueryBuilderV2';
import {
	clearPreviousQuery,
	PREVIOUS_QUERY_KEY,
} from '../QueryV2/previousQuery.utils';

// Local mocks for domain-specific heavy child components
jest.mock(
	'../QueryV2/QueryAggregation/QueryAggregation',
	() =>
		function QueryAggregation(): JSX.Element {
			return <div>QueryAggregation</div>;
		},
);
jest.mock(
	'../QueryV2/MerticsAggregateSection/MetricsAggregateSection',
	() =>
		function MetricsAggregateSection(): JSX.Element {
			return <div>MetricsAggregateSection</div>;
		},
);
// Mock networked children to avoid axios during unit tests
jest.mock(
	'../QueryV2/QuerySearch/QuerySearch',
	() =>
		function QuerySearch(): JSX.Element {
			return <div>QuerySearch</div>;
		},
);
jest.mock('container/QueryBuilder/filters', () => ({
	AggregatorFilter: (): JSX.Element => <div />,
}));
// Mock hooks
jest.mock('hooks/queryBuilder/useQueryBuilder');

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);

describe('MetricsSelect - signal source switching (standalone)', () => {
	let handleSetQueryDataMock: jest.MockedFunction<
		(index: number, q: IBuilderQuery) => void
	>;

	beforeEach(() => {
		clearPreviousQuery();
		handleSetQueryDataMock = (jest.fn() as unknown) as jest.MockedFunction<
			(index: number, q: IBuilderQuery) => void
		>;

		const metricsQuery: IBuilderQuery = {
			queryName: 'A',
			dataSource: DataSource.METRICS,
			aggregateOperator: '',
			aggregations: [
				{
					timeAggregation: '',
					metricName: 'test_metric',
					temporality: '',
					spaceAggregation: '',
				},
			],
			timeAggregation: '',
			spaceAggregation: '',
			temporality: '',
			functions: [],
			filter: {
				expression: 'service = "test"',
			},
			filters: { items: [], op: 'AND' },
			groupBy: [],
			expression: '',
			disabled: false,
			having: [] as Having[],
			limit: 10,
			stepInterval: null,
			orderBy: [],
			legend: 'A',
			source: '',
		};

		const currentQueryObj: Query = {
			id: 'test',
			unit: undefined,
			queryType: EQueryType.CLICKHOUSE,
			promql: [],
			clickhouse_sql: [],
			builder: {
				queryData: [metricsQuery],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		(mockedUseQueryBuilder as any).mockReturnValue({
			currentQuery: currentQueryObj,
			stagedQuery: null,
			lastUsedQuery: null,
			setLastUsedQuery: jest.fn(),
			supersetQuery: currentQueryObj,
			setSupersetQuery: jest.fn(),
			initialDataSource: null,
			panelType: PANEL_TYPES.TABLE,
			isEnabledQuery: true,
			handleSetQueryData: handleSetQueryDataMock,
			handleSetTraceOperatorData: jest.fn(),
			handleSetFormulaData: jest.fn(),
			handleSetQueryItemData: jest.fn(),
			handleSetConfig: jest.fn(),
			removeQueryBuilderEntityByIndex: jest.fn(),
			removeAllQueryBuilderEntities: jest.fn(),
			removeQueryTypeItemByIndex: jest.fn(),
			addNewBuilderQuery: jest.fn(),
			addNewFormula: jest.fn(),
			removeTraceOperator: jest.fn(),
			addTraceOperator: jest.fn(),
			cloneQuery: jest.fn(),
			addNewQueryItem: jest.fn(),
			redirectWithQueryBuilderData: jest.fn(),
			handleRunQuery: jest.fn(),
			resetQuery: jest.fn(),
			handleOnUnitsChange: jest.fn(),
			updateAllQueriesOperators: ((q: any) => q) as any,
			updateQueriesData: ((q: any) => q) as any,
			initQueryBuilderData: jest.fn(),
			isStagedQueryUpdated: jest.fn(() => false),
			isDefaultQuery: jest.fn(() => false),
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
		clearPreviousQuery();
	});

	it('savePreviousQuery=true: metrics → meter saves previous query in session storage with appropriate key and query', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<QueryBuilderV2
				panelType={PANEL_TYPES.TABLE}
				version="v5"
				signalSourceChangeEnabled
				savePreviousQuery
			/>,
		);
		const trigger = document.querySelector(
			'.metrics-container .source-selector .ant-select-selector',
		) as HTMLElement;

		await user.click(trigger);

		// wait for dropdown and choose Meter
		const meterOption = await screen.findByText('Meter');
		await user.click(meterOption);

		expect(handleSetQueryDataMock).toHaveBeenCalled();
		const [, arg] = handleSetQueryDataMock.mock.calls[0];
		expect(arg.queryName).toBe('A');
		expect(arg.dataSource).toBe(DataSource.METRICS);
		expect(arg.source).toBe('meter');

		// verify previousQuery store has the expected key and filter expression
		const storeRaw = sessionStorage.getItem(PREVIOUS_QUERY_KEY);
		expect(storeRaw).not.toBeNull();
		const store = JSON.parse(storeRaw || '{}') as Record<string, IBuilderQuery>;
		expect(Object.keys(store)).toContain('A:metrics::table');
		expect(store['A:metrics::table']?.filter?.expression).toBe(
			'service = "test"',
		);
	});

	it('savePreviousQuery=false: metrics → meter does not write to sessionStorage and applies defaults', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		// render WITHOUT savePreviousQuery enabled
		render(
			<QueryBuilderV2
				panelType={PANEL_TYPES.TABLE}
				version="v5"
				signalSourceChangeEnabled
			/>,
		);

		// open Source and choose Meter
		const trigger = document.querySelector(
			'.metrics-container .source-selector .ant-select-selector',
		) as HTMLElement;
		await user.click(trigger);
		const meterOption = await screen.findByText('Meter');
		await user.click(meterOption);

		// assert no session storage written
		const storeRaw = sessionStorage.getItem(PREVIOUS_QUERY_KEY);
		// either null or empty object string
		expect(storeRaw === null || storeRaw === '{}').toBe(true);

		// and query updated to defaults (at least source should be 'meter')
		expect(handleSetQueryDataMock).toHaveBeenCalled();
		const [, arg] = handleSetQueryDataMock.mock.calls[0];
		expect(arg.queryName).toBe('A');
		expect(arg.dataSource).toBe(DataSource.METRICS);
		expect(arg.source).toBe('meter');
	});
});

describe('DataSource change - Logs to Traces', () => {
	let handleSetQueryDataMock: jest.MockedFunction<
		(index: number, q: IBuilderQuery) => void
	>;

	beforeEach(() => {
		clearPreviousQuery();
		handleSetQueryDataMock = (jest.fn() as unknown) as jest.MockedFunction<
			(i: number, q: IBuilderQuery) => void
		>;

		const logsQuery: IBuilderQuery = {
			queryName: 'A',
			dataSource: DataSource.LOGS,
			aggregateOperator: '',
			aggregations: [],
			timeAggregation: '',
			spaceAggregation: '',
			temporality: '',
			functions: [],
			filter: { expression: 'body CONTAINS "error"' },
			filters: { items: [], op: 'AND' },
			groupBy: [],
			expression: '',
			disabled: false,
			having: [] as Having[],
			limit: 100,
			stepInterval: null,
			orderBy: [],
			legend: 'L',
			source: '',
		};

		const logsCurrentQuery: Query = {
			id: 'test-logs',
			unit: undefined,
			queryType: EQueryType.CLICKHOUSE,
			promql: [],
			clickhouse_sql: [],
			builder: {
				queryData: [logsQuery],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		mockedUseQueryBuilder.mockReset();
		mockedUseQueryBuilder.mockReturnValue({
			currentQuery: logsCurrentQuery,
			stagedQuery: null,
			lastUsedQuery: null,
			setLastUsedQuery: jest.fn(),
			supersetQuery: logsCurrentQuery,
			setSupersetQuery: jest.fn(),
			initialDataSource: null,
			panelType: PANEL_TYPES.TABLE,
			isEnabledQuery: true,
			handleSetQueryData: handleSetQueryDataMock,
			handleSetTraceOperatorData: jest.fn(),
			handleSetFormulaData: jest.fn(),
			handleSetQueryItemData: jest.fn(),
			handleSetConfig: jest.fn(),
			removeQueryBuilderEntityByIndex: jest.fn(),
			removeAllQueryBuilderEntities: jest.fn(),
			removeQueryTypeItemByIndex: jest.fn(),
			addNewBuilderQuery: jest.fn(),
			addNewFormula: jest.fn(),
			removeTraceOperator: jest.fn(),
			addTraceOperator: jest.fn(),
			cloneQuery: jest.fn(),
			addNewQueryItem: jest.fn(),
			redirectWithQueryBuilderData: jest.fn(),
			handleRunQuery: jest.fn(),
			resetQuery: jest.fn(),
			handleOnUnitsChange: jest.fn(),
			updateAllQueriesOperators: ((q: any) => q) as any,
			updateQueriesData: ((q: any) => q) as any,
			initQueryBuilderData: jest.fn(),
			isStagedQueryUpdated: jest.fn(() => false),
			isDefaultQuery: jest.fn(() => false),
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
		clearPreviousQuery();
	});

	it('updates query dataSource to TRACES saves previous query in session storage', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<QueryBuilderV2
				panelType={PANEL_TYPES.TABLE}
				version="v5"
				signalSourceChangeEnabled
				savePreviousQuery
			/>,
		);

		const logsTrigger = document.querySelector(
			'.query-data-source .ant-select-selector',
		) as HTMLElement;
		await user.click(logsTrigger);

		const tracesContent = screen.getByText('Traces', {
			selector: '.ant-select-item-option-content',
		});

		// click the option (prefer the option element; fallback to content)
		await user.click(
			(tracesContent.closest('[role="option"]') as HTMLElement) || tracesContent,
		);

		// verify previousQuery store saved the current LOGS snapshot before switch
		const storeRaw = sessionStorage.getItem(PREVIOUS_QUERY_KEY);
		expect(storeRaw).not.toBeNull();
		const store = JSON.parse(storeRaw || '{}') as Record<string, IBuilderQuery>;
		expect(Object.keys(store)).toContain('A:logs::table');
		expect(store['A:logs::table']?.filter?.expression).toBe(
			'body CONTAINS "error"',
		);
	});
	it('updates query dataSource to TRACES does not saves previous query in session storage', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<QueryBuilderV2
				panelType={PANEL_TYPES.TABLE}
				version="v5"
				signalSourceChangeEnabled
			/>,
		);

		const logsTrigger = document.querySelector(
			'.query-data-source .ant-select-selector',
		) as HTMLElement;
		await user.click(logsTrigger);

		const tracesContent = screen.getByText('Traces', {
			selector: '.ant-select-item-option-content',
		});

		// click the option (prefer the option element; fallback to content)
		await user.click(
			(tracesContent.closest('[role="option"]') as HTMLElement) || tracesContent,
		);

		// Assert that no snapshot was written
		const storeRaw = sessionStorage.getItem(PREVIOUS_QUERY_KEY);
		expect(storeRaw === null || storeRaw === '{}').toBe(true);
	});
});
