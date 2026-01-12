import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { cleanup, render, screen, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, QueryState } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	QueryBuilderContextType,
	ReduceOperators,
} from 'types/common/queryBuilder';
import { explorerViewToPanelType } from 'utils/explorerUtils';

import LogExplorerQuerySection from './index';

const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';
const QUERY_AGGREGATION_TEST_ID = 'query-aggregation-container';
const QUERY_ADDON_TEST_ID = 'query-add-ons';

// Mock DOM APIs that CodeMirror needs
beforeAll(() => {
	// Mock getClientRects and getBoundingClientRect for Range objects
	const mockRect: DOMRect = {
		width: 100,
		height: 20,
		top: 0,
		left: 0,
		right: 100,
		bottom: 20,
		x: 0,
		y: 0,
		toJSON: (): DOMRect => mockRect,
	} as DOMRect;

	// Create a minimal Range mock with only what CodeMirror actually uses
	const createMockRange = (): Range => {
		let startContainer: Node = document.createTextNode('');
		let endContainer: Node = document.createTextNode('');
		let startOffset = 0;
		let endOffset = 0;

		const rectList = {
			length: 1,
			item: (index: number): DOMRect | null => (index === 0 ? mockRect : null),
			0: mockRect,
		};

		const mockRange = {
			// CodeMirror uses these for text measurement
			getClientRects: (): DOMRectList => (rectList as unknown) as DOMRectList,
			getBoundingClientRect: (): DOMRect => mockRect,
			// CodeMirror calls these to set up text ranges
			setStart: (node: Node, offset: number): void => {
				startContainer = node;
				startOffset = offset;
			},
			setEnd: (node: Node, offset: number): void => {
				endContainer = node;
				endOffset = offset;
			},
			// Minimal Range properties (TypeScript requires these)
			get startContainer(): Node {
				return startContainer;
			},
			get endContainer(): Node {
				return endContainer;
			},
			get startOffset(): number {
				return startOffset;
			},
			get endOffset(): number {
				return endOffset;
			},
			get collapsed(): boolean {
				return startContainer === endContainer && startOffset === endOffset;
			},
			commonAncestorContainer: document.body,
		};
		return (mockRange as unknown) as Range;
	};

	// Mock document.createRange to return a new Range instance each time
	document.createRange = (): Range => createMockRange();

	// Mock getBoundingClientRect for elements
	Element.prototype.getBoundingClientRect = (): DOMRect => mockRect;
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): { selectedDashboard: undefined } => ({
		selectedDashboard: undefined,
	}),
}));

jest.mock('api/querySuggestions/getKeySuggestions', () => ({
	getKeySuggestions: jest.fn().mockResolvedValue({
		data: {
			data: { keys: {} },
		},
	}),
}));

jest.mock('api/querySuggestions/getValueSuggestion', () => ({
	getValueSuggestions: jest.fn().mockResolvedValue({
		data: { data: { values: { stringValues: [], numberValues: [] } } },
	}),
}));

// Mock the hooks
jest.mock('hooks/queryBuilder/useGetPanelTypesQueryParam');
jest.mock('hooks/queryBuilder/useShareBuilderUrl');

const mockUseGetPanelTypesQueryParam = jest.mocked(useGetPanelTypesQueryParam);
const mockUseShareBuilderUrl = jest.mocked(useShareBuilderUrl);

const mockUpdateAllQueriesOperators = jest.fn() as jest.MockedFunction<
	(query: Query, panelType: PANEL_TYPES, dataSource: DataSource) => Query
>;

const mockResetQuery = jest.fn() as jest.MockedFunction<
	(newCurrentQuery?: QueryState) => void
>;

const mockRedirectWithQueryBuilderData = jest.fn() as jest.MockedFunction<
	(query: Query) => void
>;

// Create a mock query that we'll use to verify persistence
const createMockQuery = (filterExpression?: string): Query => ({
	id: 'test-query-id',
	queryType: EQueryType.QUERY_BUILDER,
	builder: {
		queryData: [
			{
				aggregateAttribute: {
					id: 'body--string----false',
					dataType: DataTypes.String,
					key: 'body',
					type: '',
				},
				aggregateOperator: 'count',
				dataSource: DataSource.LOGS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				filter: filterExpression
					? {
							expression: filterExpression,
					  }
					: undefined,
				functions: [],
				groupBy: [
					{
						key: 'cloud.account.id',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [{ columnName: 'timestamp', order: 'desc' }],
				pageSize: 0,
				queryName: 'A',
				reduceTo: ReduceOperators.AVG,
				stepInterval: 60,
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	clickhouse_sql: [],
	promql: [],
});

// Helper function to verify CodeMirror content
const verifyCodeMirrorContent = async (
	expectedFilterExpression: string,
): Promise<void> => {
	await waitFor(
		() => {
			const editorContent = document.querySelector(
				CM_EDITOR_SELECTOR,
			) as HTMLElement;
			expect(editorContent).toBeInTheDocument();
			const textContent = editorContent.textContent || '';
			expect(textContent).toBe(expectedFilterExpression);
		},
		{ timeout: 3000 },
	);
};

const VIEWS_TO_TEST = [
	ExplorerViews.LIST,
	ExplorerViews.TIMESERIES,
	ExplorerViews.TABLE,
];

describe('LogExplorerQuerySection', () => {
	let mockQuery: Query;
	let mockQueryBuilderContext: Partial<QueryBuilderContextType>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockQuery = createMockQuery();

		// Mock the return value of updateAllQueriesOperators to return the same query
		mockUpdateAllQueriesOperators.mockReturnValue(mockQuery);

		// Setup query builder context mock
		mockQueryBuilderContext = {
			currentQuery: mockQuery,
			updateAllQueriesOperators: mockUpdateAllQueriesOperators,
			resetQuery: mockResetQuery,
			redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
			panelType: PANEL_TYPES.LIST,
			initialDataSource: DataSource.LOGS,
			addNewBuilderQuery: jest.fn() as jest.MockedFunction<() => void>,
			addNewFormula: jest.fn() as jest.MockedFunction<() => void>,
			handleSetConfig: jest.fn() as jest.MockedFunction<
				(panelType: PANEL_TYPES, dataSource: DataSource | null) => void
			>,
			addTraceOperator: jest.fn() as jest.MockedFunction<() => void>,
		};

		// Mock useGetPanelTypesQueryParam
		mockUseGetPanelTypesQueryParam.mockReturnValue(PANEL_TYPES.LIST);

		// Mock useShareBuilderUrl
		mockUseShareBuilderUrl.mockImplementation(() => {});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should maintain query state across multiple view changes', () => {
		const { rerender } = render(
			<LogExplorerQuerySection selectedView={ExplorerViews.LIST} />,
			undefined,
			{
				queryBuilderOverrides: mockQueryBuilderContext as QueryBuilderContextType,
			},
		);

		const initialQuery = mockQueryBuilderContext.currentQuery;

		VIEWS_TO_TEST.forEach((view) => {
			rerender(<LogExplorerQuerySection selectedView={view} />);
			expect(mockQueryBuilderContext.currentQuery).toEqual(initialQuery);
		});
	});

	it('should persist filter expressions across view changes', async () => {
		// Test with a more complex filter expression
		const complexFilter =
			"(service.name = 'api-gateway' OR service.name = 'backend') AND http.status_code IN [500, 502, 503] AND NOT error = 'timeout'";
		const queryWithComplexFilter = createMockQuery(complexFilter);

		const contextWithComplexFilter: Partial<QueryBuilderContextType> = {
			...mockQueryBuilderContext,
			currentQuery: queryWithComplexFilter,
		};

		const { rerender } = render(
			<LogExplorerQuerySection selectedView={ExplorerViews.LIST} />,
			undefined,
			{
				queryBuilderOverrides: contextWithComplexFilter as QueryBuilderContextType,
			},
		);

		VIEWS_TO_TEST.forEach(async (view) => {
			rerender(<LogExplorerQuerySection selectedView={view} />);
			await verifyCodeMirrorContent(complexFilter);
		});
	});

	it('should render QueryAggregation and QueryAddOns when switching from LIST to TIMESERIES or TABLE view', async () => {
		// Helper function to verify components are rendered
		const verifyComponentsRendered = async (): Promise<void> => {
			await waitFor(
				() => {
					expect(screen.getByTestId(QUERY_AGGREGATION_TEST_ID)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
			await waitFor(
				() => {
					expect(screen.getByTestId(QUERY_ADDON_TEST_ID)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
		};

		// Start with LIST view - QueryAggregation and QueryAddOns should NOT be rendered
		mockUseGetPanelTypesQueryParam.mockReturnValue(PANEL_TYPES.LIST);
		const contextWithList: Partial<QueryBuilderContextType> = {
			...mockQueryBuilderContext,
			panelType: PANEL_TYPES.LIST,
		};

		render(
			<LogExplorerQuerySection selectedView={ExplorerViews.LIST} />,
			undefined,
			{
				queryBuilderOverrides: contextWithList as QueryBuilderContextType,
			},
		);

		// Verify QueryAggregation is NOT rendered in LIST view
		expect(
			screen.queryByTestId(QUERY_AGGREGATION_TEST_ID),
		).not.toBeInTheDocument();

		// Verify QueryAddOns is NOT rendered in LIST view (check for one of the add-on tabs)
		expect(screen.queryByTestId(QUERY_ADDON_TEST_ID)).not.toBeInTheDocument();

		cleanup();

		// Switch to TIMESERIES view
		const timeseriesPanelType = explorerViewToPanelType[ExplorerViews.TIMESERIES];
		mockUseGetPanelTypesQueryParam.mockReturnValue(timeseriesPanelType);
		const contextWithTimeseries: Partial<QueryBuilderContextType> = {
			...mockQueryBuilderContext,
			panelType: timeseriesPanelType,
		};

		render(
			<LogExplorerQuerySection selectedView={ExplorerViews.TIMESERIES} />,
			undefined,
			{
				queryBuilderOverrides: contextWithTimeseries as QueryBuilderContextType,
			},
		);

		// Verify QueryAggregation and QueryAddOns are rendered
		await verifyComponentsRendered();

		cleanup();

		// Switch to TABLE view
		const tablePanelType = explorerViewToPanelType[ExplorerViews.TABLE];
		mockUseGetPanelTypesQueryParam.mockReturnValue(tablePanelType);
		const contextWithTable: Partial<QueryBuilderContextType> = {
			...mockQueryBuilderContext,
			panelType: tablePanelType,
		};

		render(
			<LogExplorerQuerySection selectedView={ExplorerViews.TABLE} />,
			undefined,
			{
				queryBuilderOverrides: contextWithTable as QueryBuilderContextType,
			},
		);

		// Verify QueryAggregation and QueryAddOns are still rendered in TABLE view
		await verifyComponentsRendered();
	});
});
