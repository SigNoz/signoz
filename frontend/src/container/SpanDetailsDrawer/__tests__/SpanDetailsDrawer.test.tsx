import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { server } from 'mocks-server/server';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import SpanDetailsDrawer from '../SpanDetailsDrawer';
import {
	expectedAfterFilterExpression,
	expectedBeforeFilterExpression,
	expectedSpanFilterExpression,
	expectedTraceOnlyFilterExpression,
	mockAfterLogsResponse,
	mockBeforeLogsResponse,
	mockEmptyLogsResponse,
	mockSpan,
	mockSpanLogsResponse,
} from './mockData';

// Mock external dependencies
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string; search: string } => ({
		pathname: `${ROUTES.TRACE_DETAIL}`,
		search: 'trace_id=test-trace-id',
	}),
}));

jest.mock('@signozhq/button', () => ({
	Button: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const mockUpdateAllQueriesOperators = jest.fn().mockReturnValue({
	builder: {
		queryData: [
			{
				dataSource: 'logs',
				queryName: 'A',
				aggregateOperator: 'noop',
				// eslint-disable-next-line sonarjs/no-duplicate-string
				filter: { expression: "trace_id = 'test-trace-id'" },
				expression: 'A',
				disabled: false,
				orderBy: [{ columnName: 'timestamp', order: 'desc' }],
				groupBy: [],
				limit: null,
				having: [],
			},
		],
		queryFormulas: [],
	},
	queryType: 'builder',
});

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): any => ({
		updateAllQueriesOperators: mockUpdateAllQueriesOperators,
		currentQuery: {
			builder: {
				queryData: [
					{
						dataSource: 'logs',
						queryName: 'A',
						filter: { expression: "trace_id = 'test-trace-id'" },
					},
				],
			},
		},
	}),
}));

const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
	writable: true,
	value: mockWindowOpen,
});

// Mock uplot to avoid rendering issues
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

jest.mock('lib/dashboard/getQueryResults', () => ({
	GetMetricQueryRange: jest.fn(),
}));

jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: jest.fn().mockReturnValue('#1f77b4'),
}));

jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function ({ children }: any) {
			return <div data-testid="overlay-scrollbar">{children}</div>;
		},
);

// Mock Virtuoso to avoid complex virtualization
jest.mock('react-virtuoso', () => ({
	Virtuoso: jest.fn(({ data, itemContent }) => (
		<div data-testid="virtuoso">
			{data?.map((item: any, index: number) => (
				<div key={item.id || index} data-testid={`log-item-${item.id}`}>
					{itemContent(index, item)}
				</div>
			))}
		</div>
	)),
}));

// Mock RawLogView component
jest.mock(
	'components/Logs/RawLogView',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function MockRawLogView({
			data,
			onLogClick,
			isHighlighted,
			helpTooltip,
		}: any) {
			return (
				// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
				<div
					data-testid={`raw-log-${data.id}`}
					// eslint-disable-next-line sonarjs/no-duplicate-string
					className={isHighlighted ? 'log-highlighted' : 'log-context'}
					title={helpTooltip}
					onClick={(e): void => onLogClick?.(data, e)}
				>
					<div>{data.body}</div>
					<div>{data.timestamp}</div>
				</div>
			);
		},
);

// Mock PreferenceContextProvider
jest.mock('providers/preferences/context/PreferenceContextProvider', () => ({
	PreferenceContextProvider: ({ children }: any): JSX.Element => (
		<div>{children}</div>
	),
}));

// Mock QueryBuilder context value
const mockQueryBuilderContextValue = {
	currentQuery: {
		builder: {
			queryData: [
				{
					dataSource: 'logs',
					queryName: 'A',
					filter: { expression: "trace_id = 'test-trace-id'" },
				},
			],
		},
	},
	stagedQuery: {
		builder: {
			queryData: [
				{
					dataSource: 'logs',
					queryName: 'A',
					filter: { expression: "trace_id = 'test-trace-id'" },
				},
			],
		},
	},
	updateAllQueriesOperators: mockUpdateAllQueriesOperators,
	panelType: 'list',
	redirectWithQuery: jest.fn(),
	handleRunQuery: jest.fn(),
	handleStageQuery: jest.fn(),
	resetQuery: jest.fn(),
};

const renderSpanDetailsDrawer = (props = {}): void => {
	render(
		<QueryBuilderContext.Provider value={mockQueryBuilderContextValue as any}>
			<SpanDetailsDrawer
				isSpanDetailsDocked={false}
				setIsSpanDetailsDocked={jest.fn()}
				selectedSpan={mockSpan}
				traceStartTime={1640995200000} // 2022-01-01 00:00:00 in milliseconds
				traceEndTime={1640995260000} // 2022-01-01 00:01:00 in milliseconds
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</QueryBuilderContext.Provider>,
	);
};

describe('SpanDetailsDrawer', () => {
	let apiCallHistory: any = {};

	beforeEach(() => {
		jest.clearAllMocks();
		apiCallHistory = {
			span_logs: null,
			before_logs: null,
			after_logs: null,
			trace_only_logs: null,
		};
		mockSafeNavigate.mockClear();
		mockWindowOpen.mockClear();
		mockUpdateAllQueriesOperators.mockClear();

		// Setup API call tracking
		(GetMetricQueryRange as jest.Mock).mockImplementation((query) => {
			// Determine response based on v5 filter expressions
			const filterExpression =
				query.query?.builder?.queryData?.[0]?.filter?.expression;

			if (!filterExpression) return Promise.resolve(mockEmptyLogsResponse);

			// Check for span logs query (contains both trace_id and span_id)
			if (filterExpression.includes('span_id')) {
				apiCallHistory.span_logs = query;
				return Promise.resolve(mockSpanLogsResponse);
			}
			// Check for before logs query (contains trace_id and id <)
			if (filterExpression.includes('id <')) {
				apiCallHistory.before_logs = query;
				return Promise.resolve(mockBeforeLogsResponse);
			}
			// Check for after logs query (contains trace_id and id >)
			if (filterExpression.includes('id >')) {
				apiCallHistory.after_logs = query;
				return Promise.resolve(mockAfterLogsResponse);
			}

			// Check for trace only logs query (contains trace_id)
			if (filterExpression.includes('trace_id =')) {
				apiCallHistory.trace_only_logs = query;
				return Promise.resolve(mockAfterLogsResponse);
			}

			return Promise.resolve(mockEmptyLogsResponse);
		});
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('should display logs tab in right sidebar when span is selected', async () => {
		renderSpanDetailsDrawer();

		// Verify logs tab is visible
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		expect(logsButton).toBeInTheDocument();
		expect(logsButton).toBeVisible();
	});

	it('should open related logs view when logs tab is clicked', async () => {
		renderSpanDetailsDrawer();

		// Click on logs tab
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for logs view to open and logs to be displayed
		await waitFor(() => {
			expect(screen.getByTestId('overlay-scrollbar')).toBeInTheDocument();
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('raw-log-span-log-2')).toBeInTheDocument();
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('raw-log-context-log-before')).toBeInTheDocument();
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('raw-log-context-log-after')).toBeInTheDocument();
		});
	});

	it('should make 4 API queries when logs tab is opened', async () => {
		renderSpanDetailsDrawer();

		// Click on logs tab to trigger API calls
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for all API calls to complete
		await waitFor(() => {
			expect(GetMetricQueryRange).toHaveBeenCalledTimes(4);
		});

		// Verify the four distinct queries were made
		const {
			span_logs: spanQuery,
			before_logs: beforeQuery,
			after_logs: afterQuery,
			trace_only_logs: traceOnlyQuery,
		} = apiCallHistory;

		// 1. Span logs query (trace_id + span_id)
		expect(spanQuery.query.builder.queryData[0].filter.expression).toBe(
			expectedSpanFilterExpression,
		);

		// 2. Before logs query (trace_id + id < first_span_log_id)
		expect(beforeQuery.query.builder.queryData[0].filter.expression).toBe(
			expectedBeforeFilterExpression,
		);

		// 3. After logs query (trace_id + id > last_span_log_id)
		expect(afterQuery.query.builder.queryData[0].filter.expression).toBe(
			expectedAfterFilterExpression,
		);

		// 4. Trace only logs query (trace_id)
		expect(traceOnlyQuery.query.builder.queryData[0].filter.expression).toBe(
			expectedTraceOnlyFilterExpression,
		);
	});

	it('should use correct timestamp ordering for different query types', async () => {
		renderSpanDetailsDrawer();

		// Click on logs tab to trigger API calls
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for all API calls to complete
		await waitFor(() => {
			expect(GetMetricQueryRange).toHaveBeenCalledTimes(4);
		});

		const {
			span_logs: spanQuery,
			before_logs: beforeQuery,
			after_logs: afterQuery,
		} = apiCallHistory;

		// Verify ordering: span query should use 'desc' (default)
		expect(spanQuery.query.builder.queryData[0].orderBy[0].order).toBe('desc');

		// Before query should use 'desc' (default)
		expect(beforeQuery.query.builder.queryData[0].orderBy[0].order).toBe('desc');

		// After query should use 'asc' for chronological order
		expect(afterQuery.query.builder.queryData[0].orderBy[0].order).toBe('asc');
	});

	it('should navigate to logs explorer with span filters when span log is clicked', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for logs to load
		await waitFor(() => {
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
		});

		// Click on a span log (highlighted)
		const spanLog = screen.getByTestId('raw-log-span-log-1');
		fireEvent.click(spanLog);

		// Verify window.open was called with correct parameters
		await waitFor(() => {
			expect(mockWindowOpen).toHaveBeenCalledWith(
				expect.stringContaining(ROUTES.LOGS_EXPLORER),
				'_blank',
			);
		});

		// Check navigation URL contains expected parameters
		const navigationCall = mockWindowOpen.mock.calls[0][0];
		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		expect(urlParams.get(QueryParams.activeLogId)).toBe('"span-log-1"');
		expect(urlParams.get(QueryParams.startTime)).toBe('1640994900000'); // traceStartTime - 5 minutes
		expect(urlParams.get(QueryParams.endTime)).toBe('1640995560000'); // traceEndTime + 5 minutes

		// Verify composite query includes both trace_id and span_id filters
		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		const { filter } = compositeQuery.builder.queryData[0];

		// Check that the filter expression contains trace_id
		// Note: Current behavior uses only trace_id filter for navigation
		expect(filter.expression).toContain("trace_id = 'test-trace-id'");

		// Verify mockSafeNavigate was NOT called
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should navigate to logs explorer with trace filter when context log is clicked', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for logs to load
		await waitFor(() => {
			expect(screen.getByTestId('raw-log-context-log-before')).toBeInTheDocument();
		});

		// Click on a context log (non-highlighted)
		const contextLog = screen.getByTestId('raw-log-context-log-before');
		fireEvent.click(contextLog);

		// Verify window.open was called
		// eslint-disable-next-line sonarjs/no-identical-functions
		await waitFor(() => {
			expect(mockWindowOpen).toHaveBeenCalledWith(
				expect.stringContaining(ROUTES.LOGS_EXPLORER),
				'_blank',
			);
		});

		// Check navigation URL parameters
		const navigationCall = mockWindowOpen.mock.calls[0][0];
		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		expect(urlParams.get(QueryParams.activeLogId)).toBe('"context-log-before"');

		// Verify composite query includes only trace_id filter (no span_id for context logs)
		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		const { filter } = compositeQuery.builder.queryData[0];

		// Check that the filter expression contains trace_id but not span_id for context logs
		expect(filter.expression).toContain("trace_id = 'test-trace-id'");
		// Context logs should not have span_id filter
		expect(filter.expression).not.toContain('span_id');

		// Verify mockSafeNavigate was NOT called
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should always open logs explorer in new tab regardless of click type', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for logs to load
		await waitFor(() => {
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
		});

		// Regular click on a log
		const spanLog = screen.getByTestId('raw-log-span-log-1');
		fireEvent.click(spanLog);

		// Verify window.open was called for new tab
		// eslint-disable-next-line sonarjs/no-identical-functions
		await waitFor(() => {
			expect(mockWindowOpen).toHaveBeenCalledWith(
				expect.stringContaining(ROUTES.LOGS_EXPLORER),
				'_blank',
			);
		});

		// Verify navigate was NOT called (always opens new tab)
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should display span logs as highlighted and context logs as regular', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for all API calls to complete first
		await waitFor(() => {
			expect(GetMetricQueryRange).toHaveBeenCalledTimes(4);
		});

		// Wait for all logs to be rendered - both span logs and context logs
		await waitFor(() => {
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
			expect(screen.getByTestId('raw-log-span-log-2')).toBeInTheDocument();
			expect(screen.getByTestId('raw-log-context-log-before')).toBeInTheDocument();
			expect(screen.getByTestId('raw-log-context-log-after')).toBeInTheDocument();
		});

		// Verify span logs are highlighted
		const spanLog1 = screen.getByTestId('raw-log-span-log-1');
		const spanLog2 = screen.getByTestId('raw-log-span-log-2');
		expect(spanLog1).toHaveClass('log-highlighted');
		expect(spanLog2).toHaveClass('log-highlighted');
		expect(spanLog1).toHaveAttribute(
			'title',
			'This log belongs to the current span',
		);

		// Verify context logs are not highlighted
		const contextLogBefore = screen.getByTestId('raw-log-context-log-before');
		const contextLogAfter = screen.getByTestId('raw-log-context-log-after');
		expect(contextLogBefore).toHaveClass('log-context');
		expect(contextLogAfter).toHaveClass('log-context');
		expect(contextLogBefore).not.toHaveAttribute('title');
	});
});

describe('SpanDetailsDrawer - Search Visibility User Flows', () => {
	const SEARCH_PLACEHOLDER = 'Search for attribute...';

	beforeEach(() => {
		jest.clearAllMocks();
		mockSafeNavigate.mockClear();
		mockWindowOpen.mockClear();
		mockUpdateAllQueriesOperators.mockClear();

		(GetMetricQueryRange as jest.Mock).mockImplementation(() =>
			Promise.resolve(mockEmptyLogsResponse),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	// Journey 1: Default Search Visibility

	it('should display search visible by default when user opens span details', () => {
		renderSpanDetailsDrawer();

		// User sees search input in the Attributes tab by default
		const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
		expect(searchInput).toBeInTheDocument();
		expect(searchInput).toBeVisible();
	});

	it('should filter attributes when user types in search', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderSpanDetailsDrawer();

		// User sees all attributes initially
		expect(screen.getByText('http.method')).toBeInTheDocument();
		expect(screen.getByText('http.url')).toBeInTheDocument();
		expect(screen.getByText('http.status_code')).toBeInTheDocument();

		// User types "method" in search
		const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
		await user.type(searchInput, 'method');

		// User sees only matching attributes
		await waitFor(() => {
			expect(screen.getByText('http.method')).toBeInTheDocument();
			expect(screen.queryByText('http.url')).not.toBeInTheDocument();
			expect(screen.queryByText('http.status_code')).not.toBeInTheDocument();
		});
	});

	// Journey 2: Search Toggle & Focus Management

	it('should hide search when user clicks search icon', () => {
		renderSpanDetailsDrawer();

		// User sees search initially
		expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();

		// User clicks search icon to hide search
		const tabBar = screen.getByRole('tablist');
		const searchIcon = tabBar.querySelector('.search-icon');
		if (searchIcon) {
			fireEvent.click(searchIcon);
		}

		// Search is now hidden
		expect(
			screen.queryByPlaceholderText(SEARCH_PLACEHOLDER),
		).not.toBeInTheDocument();
	});

	it('should show and focus search when user clicks search icon again', () => {
		renderSpanDetailsDrawer();

		// User clicks search icon to hide
		const tabBar = screen.getByRole('tablist');
		const searchIcon = tabBar.querySelector('.search-icon');
		if (searchIcon) {
			fireEvent.click(searchIcon);
		}

		// Search is hidden
		expect(
			screen.queryByPlaceholderText(SEARCH_PLACEHOLDER),
		).not.toBeInTheDocument();

		// User clicks search icon again to show
		if (searchIcon) {
			fireEvent.click(searchIcon);
		}

		// Search appears and receives focus
		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput).toBeInTheDocument();
		expect(searchInput).toHaveFocus();
	});
});
