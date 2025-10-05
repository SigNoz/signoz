import { EmptyLogsListConfig } from 'container/LogsExplorerList/utils';
import { server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';

import SpanLogs from '../SpanLogs';

// Mock external dependencies
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): any => ({
		updateAllQueriesOperators: jest.fn().mockReturnValue({
			builder: {
				queryData: [
					{
						dataSource: 'logs',
						queryName: 'A',
						aggregateOperator: 'noop',
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
		}),
	}),
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
	writable: true,
	value: mockWindowOpen,
});

// Mock Virtuoso to avoid complex virtualization
jest.mock('react-virtuoso', () => ({
	Virtuoso: jest.fn(({ data, itemContent }: any) => (
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
		function MockRawLogView({
			data,
			onLogClick,
			isHighlighted,
			helpTooltip,
		}: any): JSX.Element {
			return (
				<button
					type="button"
					data-testid={`raw-log-${data.id}`}
					className={isHighlighted ? 'log-highlighted' : 'log-context'}
					title={helpTooltip}
					onClick={(e): void => onLogClick?.(data, e)}
				>
					<div>{data.body}</div>
					<div>{data.timestamp}</div>
				</button>
			);
		},
);

// Mock PreferenceContextProvider
jest.mock('providers/preferences/context/PreferenceContextProvider', () => ({
	PreferenceContextProvider: ({ children }: any): JSX.Element => (
		<div>{children}</div>
	),
}));

// Mock OverlayScrollbar
jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	default: ({ children }: any): JSX.Element => (
		<div data-testid="overlay-scrollbar">{children}</div>
	),
}));

// Mock LogsLoading component
jest.mock('container/LogsLoading/LogsLoading', () => ({
	LogsLoading: function MockLogsLoading(): JSX.Element {
		return <div data-testid="logs-loading">Loading logs...</div>;
	},
}));

// Mock LogsError component
jest.mock(
	'container/LogsError/LogsError',
	() =>
		function MockLogsError(): JSX.Element {
			return <div data-testid="logs-error">Error loading logs</div>;
		},
);

// Mock EmptyLogsSearch component
jest.mock(
	'container/EmptyLogsSearch/EmptyLogsSearch',
	() =>
		function MockEmptyLogsSearch({
			customMessage,
		}: {
			// eslint-disable-next-line react/require-default-props
			customMessage?: EmptyLogsListConfig;
		}): JSX.Element {
			return (
				<div data-testid="empty-logs-search">
					{customMessage && (
						<>
							<div data-testid="empty-state-title">{customMessage.title}</div>
							<div data-testid="empty-state-subtitle">{customMessage.subTitle}</div>
							<div data-testid="empty-state-description">
								{Array.isArray(customMessage.description) ? (
									<ul>
										{customMessage.description.map((desc) => (
											<li key={desc}>{desc}</li>
										))}
									</ul>
								) : (
									customMessage.description
								)}
							</div>
							{customMessage.documentationLinks && (
								<div data-testid="documentation-links">
									<div>RESOURCES</div>
									{customMessage.documentationLinks.map((link, index) => (
										<a key={link.text} href={link.url} data-testid={`doc-link-${index}`}>
											{link.text}
										</a>
									))}
								</div>
							)}
						</>
					)}
				</div>
			);
		},
);

const mockEmptyStateConfig: EmptyLogsListConfig = {
	title: 'No logs found for this trace.',
	subTitle: 'This could be because :',
	description: [
		'Logs are not linked to Traces.',
		'Logs are not being sent to SigNoz.',
		'No logs are associated with this particular trace/span.',
	],
	documentationLinks: [
		{
			text: 'Sending logs to SigNoz',
			url: 'https://signoz.io/docs/logs-management/send-logs-to-signoz/',
		},
		{
			text: 'Correlate traces and logs',
			url:
				'https://signoz.io/docs/traces-management/guides/correlate-traces-and-logs/',
		},
	],
	clearFiltersButtonText: 'Clear filters from Trace to view other logs',
	showClearFiltersButton: true,
	onClearFilters: jest.fn(),
};

const TEST_TRACE_ID = 'test-trace-id';
const TEST_SPAN_ID = 'test-span-id';

const defaultProps = {
	traceId: TEST_TRACE_ID,
	spanId: TEST_SPAN_ID,
	timeRange: {
		startTime: 1640995200000,
		endTime: 1640995260000,
	},
	logs: [],
	isLoading: false,
	isError: false,
	isFetching: false,
	isLogSpanRelated: jest.fn().mockReturnValue(false),
	handleExplorerPageRedirect: jest.fn(),
};

describe('SpanLogs', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockWindowOpen.mockClear();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('should show simple empty state when span has no logs but trace has logs', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<SpanLogs {...defaultProps} />);

		// Should show simple empty state (no emptyStateConfig provided)
		expect(
			screen.getByText('No logs found for selected span.'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Try viewing logs for the current trace.'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', {
				name: /log explorer/i,
			}),
		).toBeInTheDocument();

		// Should NOT show enhanced empty state
		expect(screen.queryByTestId('empty-logs-search')).not.toBeInTheDocument();
		expect(screen.queryByTestId('documentation-links')).not.toBeInTheDocument();
	});

	it('should show enhanced empty state when entire trace has no logs', () => {
		render(
			// eslint-disable-next-line react/jsx-props-no-spreading
			<SpanLogs {...defaultProps} emptyStateConfig={mockEmptyStateConfig} />,
		);

		// Should show enhanced empty state with custom message
		expect(screen.getByTestId('empty-logs-search')).toBeInTheDocument();
		expect(screen.getByTestId('empty-state-title')).toHaveTextContent(
			'No logs found for this trace.',
		);
		expect(screen.getByTestId('empty-state-subtitle')).toHaveTextContent(
			'This could be because :',
		);

		// Should show description list
		const descriptionList = screen.getByTestId('empty-state-description');
		expect(descriptionList).toBeInTheDocument();
		expect(descriptionList).toHaveTextContent('Logs are not linked to Traces.');
		expect(descriptionList).toHaveTextContent(
			'Logs are not being sent to SigNoz.',
		);
		expect(descriptionList).toHaveTextContent(
			'No logs are associated with this particular trace/span.',
		);

		// Should NOT show simple empty state
		expect(
			screen.queryByText('No logs found for selected span.'),
		).not.toBeInTheDocument();
	});

	it('should display documentation links in enhanced empty state', () => {
		render(
			// eslint-disable-next-line react/jsx-props-no-spreading
			<SpanLogs {...defaultProps} emptyStateConfig={mockEmptyStateConfig} />,
		);

		// Should show documentation links section
		const docLinks = screen.getByTestId('documentation-links');
		expect(docLinks).toBeInTheDocument();
		expect(docLinks).toHaveTextContent('RESOURCES');

		// Should show both documentation links
		const sendingLogsLink = screen.getByTestId('doc-link-0');
		const correlateLink = screen.getByTestId('doc-link-1');

		expect(sendingLogsLink).toHaveTextContent('Sending logs to SigNoz');
		expect(sendingLogsLink).toHaveAttribute(
			'href',
			'https://signoz.io/docs/logs-management/send-logs-to-signoz/',
		);

		expect(correlateLink).toHaveTextContent('Correlate traces and logs');
		expect(correlateLink).toHaveAttribute(
			'href',
			'https://signoz.io/docs/traces-management/guides/correlate-traces-and-logs/',
		);
	});
	it('should call handleExplorerPageRedirect when Log Explorer button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockHandleExplorerPageRedirect = jest.fn();

		render(
			<SpanLogs
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...defaultProps}
				handleExplorerPageRedirect={mockHandleExplorerPageRedirect}
			/>,
		);

		const logExplorerButton = screen.getByRole('button', {
			name: /log explorer/i,
		});
		await user.click(logExplorerButton);

		expect(mockHandleExplorerPageRedirect).toHaveBeenCalledTimes(1);
	});
});
