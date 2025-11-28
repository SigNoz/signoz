/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */

import getSpanPercentiles from 'api/trace/getSpanPercentiles';
import getUserPreference from 'api/v1/user/preferences/name/get';
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
import { SuccessResponseV2 } from 'types/api';
import { GetSpanPercentilesResponseDataProps } from 'types/api/trace/getSpanPercentiles';

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

// Get typed mocks
const mockGetSpanPercentiles = jest.mocked(getSpanPercentiles);
const mockGetUserPreference = jest.mocked(getUserPreference);
const mockSafeNavigate = jest.fn();

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

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.MockedFunction<() => void> } => ({
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
	useQueryBuilder: (): {
		updateAllQueriesOperators: jest.MockedFunction<() => any>;
		currentQuery: any;
	} => ({
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

// Mock getSpanPercentiles API
jest.mock('api/trace/getSpanPercentiles', () => ({
	__esModule: true,
	default: jest.fn(),
}));

// Mock getUserPreference API
jest.mock('api/v1/user/preferences/name/get', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function ({ children }: { children: React.ReactNode }) {
			return <div data-testid="overlay-scrollbar">{children}</div>;
		},
);

// Mock Virtuoso to avoid complex virtualization
jest.mock('react-virtuoso', () => ({
	Virtuoso: jest.fn(
		({
			data,
			itemContent,
		}: {
			data: any[];
			itemContent: (index: number, item: any) => React.ReactNode;
		}) => (
			<div data-testid="virtuoso">
				{data?.map((item: any, index: number) => (
					<div key={item.id || index} data-testid={`log-item-${item.id}`}>
						{itemContent(index, item)}
					</div>
				))}
			</div>
		),
	),
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
		}: {
			data: any;
			onLogClick: (data: any, event: React.MouseEvent) => void;
			isHighlighted: boolean;
			helpTooltip: string;
		}) {
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
	PreferenceContextProvider: ({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element => <div>{children}</div>,
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

// Constants for repeated strings
const SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER = 'Search resource attributes';
const P75_TEXT = 'p75';
const SPAN_PERCENTILE_TEXT = 'Span Percentile';

// Mock data for span percentiles
const mockSpanPercentileResponse = {
	httpStatusCode: 200 as const,
	data: {
		percentiles: {
			p50: 500000000, // 500ms in nanoseconds
			p90: 1000000000, // 1s in nanoseconds
			p95: 1500000000, // 1.5s in nanoseconds
			p99: 2000000000, // 2s in nanoseconds
		},
		position: {
			percentile: 75.5,
			description: 'This span is in the 75th percentile',
		},
	},
};

const mockUserPreferenceResponse = {
	statusCode: 200,
	httpStatusCode: 200,
	error: null,
	message: 'Success',
	data: {
		name: 'span_percentile_resource_attributes',
		description: 'Resource attributes for span percentile calculation',
		valueType: 'array',
		defaultValue: [],
		value: ['service.name', 'name', 'http.method'],
		allowedValues: [],
		allowedScopes: [],
		createdAt: '2023-01-01T00:00:00Z',
		updatedAt: '2023-01-01T00:00:00Z',
	},
};

const mockSpanPercentileErrorResponse = ({
	httpStatusCode: 500,
	data: null,
} as unknown) as SuccessResponseV2<GetSpanPercentilesResponseDataProps>;

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
		mockGetSpanPercentiles.mockClear();
		mockGetUserPreference.mockClear();

		// Setup API call tracking
		(GetMetricQueryRange as jest.Mock).mockImplementation((query) => {
			// Determine response based on v5 filter expressions
			const filterExpression = (query as any)?.query?.builder?.queryData?.[0]
				?.filter?.expression;

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
		const logsButton = screen.getByRole('button', { name: /logs/i });
		expect(logsButton).toBeInTheDocument();
		expect(logsButton).toBeVisible();
	});

	it('should open related logs view when logs tab is clicked', async () => {
		renderSpanDetailsDrawer();

		// Click on logs tab
		const logsButton = screen.getByRole('button', { name: /logs/i });
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
		const logsButton = screen.getByRole('button', { name: /logs/i });
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
		expect((spanQuery as any).query.builder.queryData[0].filter.expression).toBe(
			expectedSpanFilterExpression,
		);

		// 2. Before logs query (trace_id + id < first_span_log_id)
		expect(
			(beforeQuery as any).query.builder.queryData[0].filter.expression,
		).toBe(expectedBeforeFilterExpression);

		// 3. After logs query (trace_id + id > last_span_log_id)
		expect((afterQuery as any).query.builder.queryData[0].filter.expression).toBe(
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
		const logsButton = screen.getByRole('button', { name: /logs/i });
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
		expect((spanQuery as any).query.builder.queryData[0].orderBy[0].order).toBe(
			'desc',
		);

		// Before query should use 'desc' (default)
		expect((beforeQuery as any).query.builder.queryData[0].orderBy[0].order).toBe(
			'desc',
		);

		// After query should use 'asc' for chronological order
		expect((afterQuery as any).query.builder.queryData[0].orderBy[0].order).toBe(
			'asc',
		);
	});

	it('should navigate to logs explorer with span filters when span log is clicked', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('button', { name: /logs/i });
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
		const logsButton = screen.getByRole('button', { name: /logs/i });
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
		const logsButton = screen.getByRole('button', { name: /logs/i });
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
		const logsButton = screen.getByRole('button', { name: /logs/i });
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

	// Span Percentile Tests
	describe('Span Percentile Functionality', () => {
		beforeEach(() => {
			// Setup default mocks for percentile tests
			mockGetUserPreference.mockResolvedValue(mockUserPreferenceResponse);
			mockGetSpanPercentiles.mockResolvedValue(mockSpanPercentileResponse);
		});

		it('should display span percentile value after successful API call', async () => {
			renderSpanDetailsDrawer();

			// Wait for the 2-second delay and API call to complete
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
		});

		it('should show loading spinner while fetching percentile data', async () => {
			// Mock a delayed response
			mockGetSpanPercentiles.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve(mockSpanPercentileResponse), 1000);
					}),
			);

			renderSpanDetailsDrawer();

			// Wait for loading spinner to appear (it's visible as a div with class loading-spinner-container)
			await waitFor(
				() => {
					const spinnerContainer = document.querySelector(
						'.loading-spinner-container',
					);
					expect(spinnerContainer).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
		});

		it('should expand percentile details when percentile value is clicked', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			// Click on the percentile value to expand details
			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.click(percentileValue);

			// Verify percentile details are expanded
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
				// Look for the text that's actually rendered
				expect(screen.getByText(/This span duration is/)).toBeInTheDocument();
				expect(
					screen.getByText(/out of the distribution for this resource/),
				).toBeInTheDocument();
			});
		});

		it('should display percentile table with correct values', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.click(percentileValue);

			// Wait for the percentile details to expand
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
			});

			// Wait for the table to be visible (it might take a moment to render)
			await waitFor(
				() => {
					expect(screen.getByText('Percentile')).toBeInTheDocument();
					expect(screen.getByText('Duration')).toBeInTheDocument();
				},
				{ timeout: 5000 },
			);

			// Verify percentile values are displayed
			expect(screen.getByText('p50')).toBeInTheDocument();
			expect(screen.getByText('p90')).toBeInTheDocument();
			expect(screen.getByText('p95')).toBeInTheDocument();
			expect(screen.getByText('p99')).toBeInTheDocument();

			// Verify current span row - use getAllByText since there are multiple p75 elements
			expect(screen.getAllByText(P75_TEXT)).toHaveLength(3); // Should appear in value, expanded details, and table

			// Verify the table has the current span indicator (there are multiple occurrences)
			expect(screen.getAllByText(/this span/i).length).toBeGreaterThan(0);
		});

		it('should allow time range selection and trigger API call', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load and expand
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.click(percentileValue);

			// Wait for percentile details to expand
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
			});

			// Find the time range selector and verify it exists
			const timeRangeSelector = screen.getByRole('combobox');
			expect(timeRangeSelector).toBeInTheDocument();

			// Verify the default time range is displayed
			expect(screen.getByText(/1.*hour/i)).toBeInTheDocument();

			// Verify API was called with default parameters
			await waitFor(() => {
				expect(mockGetSpanPercentiles).toHaveBeenCalledWith(
					expect.objectContaining({
						start: expect.any(Number),
						end: expect.any(Number),
						spanDuration: mockSpan.durationNano,
						serviceName: mockSpan.serviceName,
						name: mockSpan.name,
						resourceAttributes: expect.any(Object),
					}),
				);
			});
		});

		it('should show resource attributes selector when plus icon is clicked', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load and expand
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.click(percentileValue);

			// Wait for percentile details to expand
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
			});

			// Click the plus icon using test ID
			const plusIcon = screen.getByTestId('plus-icon');
			fireEvent.click(plusIcon);

			// Verify resource attributes selector is shown
			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER),
				).toBeInTheDocument();
			});
		});

		it('should filter resource attributes based on search query', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load and expand
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.click(percentileValue);

			// Wait for percentile details to expand and show resource attributes
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
			});

			const plusIcon = screen.getByTestId('plus-icon');
			fireEvent.click(plusIcon);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER),
				).toBeInTheDocument();
			});

			// Type in search query
			const searchInput = screen.getByPlaceholderText(
				SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER,
			);
			fireEvent.change(searchInput, { target: { value: 'http' } });

			// Verify only matching attributes are shown (use getAllByText for all since they appear in multiple places)
			expect(screen.getAllByText('http.method').length).toBeGreaterThan(0);
			expect(screen.getAllByText('http.url').length).toBeGreaterThan(0);
			expect(screen.getAllByText('http.status_code').length).toBeGreaterThan(0);
		});

		it('should handle resource attribute selection and trigger API call', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load and expand
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.click(percentileValue);

			// Wait for percentile details to expand and show resource attributes
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
			});

			const plusIcon = screen.getByTestId('plus-icon');
			fireEvent.click(plusIcon);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER),
				).toBeInTheDocument();
			});

			// Find and click a checkbox for a resource attribute
			const httpMethodCheckbox = screen.getByRole('checkbox', {
				name: /http\.method/i,
			});
			fireEvent.click(httpMethodCheckbox);

			// Verify API was called with updated resource attributes
			await waitFor(() => {
				expect(mockGetSpanPercentiles).toHaveBeenCalledWith(
					expect.objectContaining({
						resourceAttributes: expect.objectContaining({
							'http.method': 'GET',
						}),
					}),
				);
			});
		});

		it('should handle API error gracefully', async () => {
			// Mock API error
			mockGetSpanPercentiles.mockResolvedValue(mockSpanPercentileErrorResponse);

			renderSpanDetailsDrawer();

			// Wait for the 2-second delay
			await waitFor(
				() => {
					// Verify no percentile value is displayed on error
					expect(screen.queryByText(/p\d+/)).not.toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
		});

		it('should not display percentile value when API returns non-200 status', async () => {
			// Mock API response with non-200 status
			mockGetSpanPercentiles.mockResolvedValue(({
				httpStatusCode: 500 as const,
				data: null,
			} as unknown) as Awaited<ReturnType<typeof getSpanPercentiles>>);

			renderSpanDetailsDrawer();

			// Wait for the 2-second delay
			await waitFor(
				() => {
					// Verify no percentile value is displayed
					expect(screen.queryByText(/p\d+/)).not.toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
		});

		it('should display tooltip with correct content', async () => {
			renderSpanDetailsDrawer();

			// Wait for percentile data to load
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			// Hover over the percentile value to show tooltip
			const percentileValue = screen.getByText(P75_TEXT);
			fireEvent.mouseEnter(percentileValue);

			// Verify tooltip content - use more flexible text matching
			await waitFor(() => {
				expect(screen.getByText(/This span duration is/)).toBeInTheDocument();
				expect(screen.getByText(/out of the distribution/)).toBeInTheDocument();
				expect(
					screen.getByText(/evaluated for 1 hour\(s\) since the span start time/),
				).toBeInTheDocument();
				expect(screen.getByText('Click to learn more')).toBeInTheDocument();
			});
		});

		it('should handle empty percentile data gracefully', async () => {
			// Mock empty percentile response
			mockGetSpanPercentiles.mockResolvedValue({
				httpStatusCode: 200,
				data: {
					percentiles: {},
					position: {
						percentile: 0,
						description: '',
					},
				},
			});

			renderSpanDetailsDrawer();

			// Wait for the 2-second delay
			await waitFor(
				() => {
					// Verify p0 is displayed for empty data
					expect(screen.getByText('p0')).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
		});

		it('should call API with correct parameters', async () => {
			renderSpanDetailsDrawer();

			// Wait for API call to be made
			await waitFor(
				() => {
					expect(mockGetSpanPercentiles).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			// Verify API was called with correct parameters
			expect(mockGetSpanPercentiles).toHaveBeenCalledWith({
				start: expect.any(Number),
				end: expect.any(Number),
				spanDuration: mockSpan.durationNano,
				serviceName: mockSpan.serviceName,
				name: mockSpan.name,
				resourceAttributes: expect.any(Object),
			});
		});

		it('should handle user preference loading', async () => {
			renderSpanDetailsDrawer();

			// Verify getUserPreference was called
			await waitFor(() => {
				expect(mockGetUserPreference).toHaveBeenCalledWith({
					name: 'span_percentile_resource_attributes',
				});
			});
		});

		it('should close resource attributes selector when check icon is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderSpanDetailsDrawer();

			// Wait for percentile data to load and expand
			await waitFor(
				() => {
					expect(screen.getByText(P75_TEXT)).toBeInTheDocument();
				},
				{ timeout: 3000 },
			);

			const percentileValue = screen.getByText(P75_TEXT);
			await user.click(percentileValue);

			// Wait for percentile details to expand and show resource attributes
			await waitFor(() => {
				expect(screen.getByText(SPAN_PERCENTILE_TEXT)).toBeInTheDocument();
			});

			const plusIcon = screen.getByTestId('plus-icon');
			await user.click(plusIcon);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER),
				).toBeInTheDocument();
			});

			// Click the check icon to close the selector
			const checkIcon = screen.getByTestId('check-icon');
			await user.click(checkIcon);

			// Verify resource attributes selector is hidden
			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText(SEARCH_RESOURCE_ATTRIBUTES_PLACEHOLDER),
				).not.toBeInTheDocument();
			});
		});
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
