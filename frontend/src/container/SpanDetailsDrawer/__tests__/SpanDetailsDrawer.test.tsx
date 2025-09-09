import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { server } from 'mocks-server/server';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

import SpanDetailsDrawer from '../SpanDetailsDrawer';
import {
	expectedAfterFilters,
	expectedBeforeFilters,
	expectedSpanFilters,
	mockAfterLogsResponse,
	mockBeforeLogsResponse,
	mockEmptyLogsResponse,
	mockSpan,
	mockSpanLogsResponse,
} from './mockData';

// Mock external dependencies
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.TRACE_DETAIL}`,
	}),
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
				filters: { items: [], op: 'AND' },
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
						filters: { items: [], op: 'AND' },
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

// Mock GetMetricQueryRange to track API calls
jest.mock('lib/dashboard/getQueryResults', () => ({
	GetMetricQueryRange: jest.fn(),
}));

// Mock generateColor to avoid color generation issues
jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: jest.fn().mockReturnValue('#1f77b4'),
}));

// Mock OverlayScrollbar to avoid virtualization issues
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

describe('SpanDetailsDrawer', () => {
	let apiCallHistory: any[] = [];

	beforeEach(() => {
		jest.clearAllMocks();
		apiCallHistory = [];
		mockSafeNavigate.mockClear();
		mockWindowOpen.mockClear();
		mockUpdateAllQueriesOperators.mockClear();

		// Setup API call tracking
		(GetMetricQueryRange as jest.Mock).mockImplementation((query) => {
			apiCallHistory.push(query);

			// Determine response based on filters
			const filters = query.query?.builder?.queryData?.[0]?.filters;

			if (!filters?.items) return Promise.resolve(mockEmptyLogsResponse);

			const hasSpanIdFilter = filters.items.some(
				(item: any) => item.key?.key === 'span_id',
			);
			const hasIdLtFilter = filters.items.some(
				(item: any) => item.key?.key === 'id' && item.op === '<',
			);
			const hasIdGtFilter = filters.items.some(
				(item: any) => item.key?.key === 'id' && item.op === '>',
			);

			if (hasSpanIdFilter) {
				return Promise.resolve(mockSpanLogsResponse);
			}
			if (hasIdLtFilter) {
				return Promise.resolve(mockBeforeLogsResponse);
			}
			if (hasIdGtFilter) {
				return Promise.resolve(mockAfterLogsResponse);
			}

			return Promise.resolve(mockEmptyLogsResponse);
		});
	});

	afterEach(() => {
		server.resetHandlers();
	});

	// Mock QueryBuilder context value
	const mockQueryBuilderContextValue = {
		currentQuery: {
			builder: {
				queryData: [
					{
						dataSource: 'logs',
						queryName: 'A',
						filters: { items: [], op: 'AND' },
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
						filters: { items: [], op: 'AND' },
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

		// Wait for logs view to open
		await waitFor(() => {
			expect(screen.getByTestId('overlay-scrollbar')).toBeInTheDocument();
		});

		// Verify logs are displayed
		await waitFor(() => {
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
			expect(screen.getByTestId('raw-log-span-log-2')).toBeInTheDocument();
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('raw-log-context-log-before')).toBeInTheDocument();
			expect(screen.getByTestId('raw-log-context-log-after')).toBeInTheDocument();
		});
	});

	it('should make three API queries when logs tab is opened', async () => {
		renderSpanDetailsDrawer();

		// Click on logs tab to trigger API calls
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for all API calls to complete
		await waitFor(
			() => {
				expect(GetMetricQueryRange).toHaveBeenCalledTimes(3);
			},
			{ timeout: 5000 },
		);

		// Verify the three distinct queries were made
		const [spanQuery, beforeQuery, afterQuery] = apiCallHistory;

		// 1. Span logs query (trace_id + span_id)
		expect(spanQuery.query.builder.queryData[0].filters).toMatchObject(
			expectedSpanFilters,
		);

		// 2. Before logs query (trace_id + id < first_span_log_id)
		expect(beforeQuery.query.builder.queryData[0].filters).toMatchObject(
			expectedBeforeFilters,
		);

		// 3. After logs query (trace_id + id > last_span_log_id)
		expect(afterQuery.query.builder.queryData[0].filters).toMatchObject(
			expectedAfterFilters,
		);
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

		// Verify navigation was called with correct parameters
		await waitFor(() => {
			expect(mockSafeNavigate).toHaveBeenCalledWith(
				expect.stringContaining(ROUTES.LOGS_EXPLORER),
			);
		});

		// Check navigation URL contains expected parameters
		const navigationCall = mockSafeNavigate.mock.calls[0][0];
		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		expect(urlParams.get(QueryParams.activeLogId)).toBe('"span-log-1"');
		expect(urlParams.get(QueryParams.startTime)).toBe('1640994900000'); // traceStartTime - 5 minutes
		expect(urlParams.get(QueryParams.endTime)).toBe('1640995560000'); // traceEndTime + 5 minutes

		// Verify composite query includes both trace_id and span_id filters
		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		const { filters } = compositeQuery.builder.queryData[0];

		expect(filters.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ key: 'trace_id' }),
					value: 'test-trace-id',
				}),
				expect.objectContaining({
					key: expect.objectContaining({ key: 'span_id' }),
					value: 'test-span-id',
				}),
			]),
		);
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

		// Verify navigation was called
		// eslint-disable-next-line sonarjs/no-identical-functions
		await waitFor(() => {
			expect(mockSafeNavigate).toHaveBeenCalledWith(
				expect.stringContaining(ROUTES.LOGS_EXPLORER),
			);
		});

		// Check navigation URL parameters
		const navigationCall = mockSafeNavigate.mock.calls[0][0];
		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		expect(urlParams.get(QueryParams.activeLogId)).toBe('"context-log-before"');

		// Verify composite query includes only trace_id filter (no span_id)
		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		const { filters } = compositeQuery.builder.queryData[0];

		expect(filters.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ key: 'trace_id' }),
					value: 'test-trace-id',
				}),
			]),
		);

		// Verify that span_id filter is present
		const hasSpanIdFilter = filters.items.some(
			(item: any) => item.key?.key === 'span_id',
		);
		expect(hasSpanIdFilter).toBe(true);
	});

	it('should open logs explorer in new tab when ctrl+click is used', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for logs to load
		await waitFor(() => {
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
		});

		// Ctrl+click on a log
		const spanLog = screen.getByTestId('raw-log-span-log-1');
		fireEvent.click(spanLog, { ctrlKey: true });

		// Verify window.open was called instead of navigate
		await waitFor(() => {
			expect(mockWindowOpen).toHaveBeenCalledWith(
				expect.stringContaining(ROUTES.LOGS_EXPLORER),
				'_blank',
			);
		});

		// Verify navigate was NOT called
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should handle empty logs state', async () => {
		// Mock empty response for all queries
		(GetMetricQueryRange as jest.Mock).mockResolvedValue(mockEmptyLogsResponse);

		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait and verify empty state is shown
		await waitFor(() => {
			expect(screen.getByText('No logs found for this span')).toBeInTheDocument();
		});
	});

	it('should display span logs as highlighted and context logs as regular', async () => {
		renderSpanDetailsDrawer();

		// Open logs view
		const logsButton = screen.getByRole('radio', { name: /logs/i });
		fireEvent.click(logsButton);

		// Wait for logs to load
		await waitFor(() => {
			expect(screen.getByTestId('raw-log-span-log-1')).toBeInTheDocument();
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
