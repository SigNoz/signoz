/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { AppProvider } from 'providers/App/App';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { MemoryRouter, Route } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { Span } from 'types/api/trace/getTraceV2';

import SpanDetailsDrawer from '../SpanDetailsDrawer';

// Mock external dependencies following the same pattern as AttributeActions tests
const mockRedirectWithQueryBuilderData = jest.fn();
const mockNotifications = {
	success: jest.fn(),
	error: jest.fn(),
};
const mockSetCopy = jest.fn();
const mockQueryClient = {
	fetchQuery: jest.fn(),
};

// Mock the hooks - same as AttributeActions test setup
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): any => ({
		currentQuery: {
			builder: {
				queryData: [
					{
						aggregateOperator: 'count',
						aggregateAttribute: { key: 'signoz_span_duration' },
						filters: { items: [], op: 'AND' },
						filter: { expression: '' },
						groupBy: [],
					},
				],
			},
		},
		redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
	}),
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({ notifications: mockNotifications }),
}));

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): any => [{ value: '' }, mockSetCopy],
}));

jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: (): any => mockQueryClient,
}));

jest.mock('@signozhq/sonner', () => ({ toast: jest.fn() }));

// Mock the API response for getAggregateKeys
const mockAggregateKeysResponse = {
	payload: {
		attributeKeys: [
			{
				key: 'name',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
			},
			{
				key: 'serviceName',
				dataType: 'string',
				type: 'resource',
				isColumn: true,
			},
			{
				key: 'spanKind',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
			},
			{
				key: 'statusCodeString',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
			},
			{
				key: 'span_id',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
			},
			{
				key: 'durationNano',
				dataType: 'number',
				type: 'tag',
				isColumn: true,
			},
		],
	},
};

beforeEach(() => {
	jest.clearAllMocks();
	mockQueryClient.fetchQuery.mockResolvedValue(mockAggregateKeysResponse);
});

// Create realistic mock span data for testing
const createMockSpan = (overrides: Partial<Span> = {}): Span => ({
	spanId: '28a8a67365d0bd8b',
	traceId: '000000000000000071dc9b0a338729b4',
	name: 'HTTP GET /api/users',
	timestamp: 1699872000000000,
	durationNano: 150000000,
	serviceName: 'frontend-service',
	spanKind: 'server',
	statusCodeString: 'OK',
	statusMessage: '',
	tagMap: {
		'http.method': 'GET',
		'http.url': '/api/users?page=1',
	},
	event: [],
	references: [],
	hasError: false,
	rootSpanId: '',
	parentSpanId: '',
	kind: 0,
	rootName: '',
	hasChildren: false,
	hasSibling: false,
	subTreeNodeCount: 0,
	level: 0,
	...overrides,
});

interface RenderResult {
	user: ReturnType<typeof userEvent.setup>;
}

const renderSpanDetailsDrawer = (
	span: Span = createMockSpan(),
): RenderResult => {
	const user = userEvent.setup({ pointerEventsCheck: 0 });

	render(
		<MockQueryClientProvider>
			<AppProvider>
				<MemoryRouter>
					<Route>
						<SpanDetailsDrawer
							isSpanDetailsDocked={false}
							setIsSpanDetailsDocked={jest.fn()}
							selectedSpan={span}
							traceStartTime={span.timestamp}
							traceEndTime={span.timestamp + span.durationNano}
						/>
					</Route>
				</MemoryRouter>
			</AppProvider>
		</MockQueryClientProvider>,
	);

	return { user };
};

describe('SpanFieldActions User Flow Tests', () => {
	describe('Primary Filter Flow', () => {
		it('should allow user to filter for span name value and navigate to traces explorer', async () => {
			const testSpan = createMockSpan({
				name: 'GET /api/orders',
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// User sees the span name displayed
			expect(screen.getByText('span name')).toBeInTheDocument();
			expect(screen.getByText('GET /api/orders')).toBeInTheDocument();

			// Find the span name field item
			const spanNameItem = screen.getByText('span name').closest('.item');
			expect(spanNameItem).toBeInTheDocument();

			// User hovers over the span name field to reveal action buttons
			await user.hover(spanNameItem!);

			// Action buttons should appear on hover
			const actionButtons = spanNameItem!.querySelector('.action-btn');
			expect(actionButtons).toBeInTheDocument();

			const filterForButton = spanNameItem!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			expect(filterForButton).toBeInTheDocument();

			// User clicks "Filter for value" button
			await user.click(filterForButton);

			// Verify navigation to traces explorer with correct filter
			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									dataSource: 'traces',
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'name' }),
												op: '=',
												value: 'GET /api/orders',
											}),
										]),
									}),
								}),
							]),
						}),
					}),
					{},
					ROUTES.TRACES_EXPLORER,
				);
			});
		});

		it('should allow user to filter for service name with proper field mapping', async () => {
			const testSpan = createMockSpan({
				serviceName: 'payment-service',
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// User sees the service displayed
			expect(screen.getByText('service')).toBeInTheDocument();
			expect(screen.getByText('payment-service')).toBeInTheDocument();

			// Find the service field item
			const serviceItem = screen.getByText('service').closest('.item');
			expect(serviceItem).toBeInTheDocument();

			// User hovers and clicks filter for
			await user.hover(serviceItem!);
			const filterForButton = serviceItem!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			await user.click(filterForButton);

			// Verify correct field mapping: "service" display name → "serviceName" query key
			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									dataSource: 'traces',
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'serviceName' }),
												op: '=',
												value: 'payment-service',
											}),
										]),
									}),
								}),
							]),
						}),
					}),
					{},
					ROUTES.TRACES_EXPLORER,
				);
			});
		});
	});

	describe('Filter Out Flow', () => {
		it('should allow user to exclude span kind value and navigate to traces explorer', async () => {
			const testSpan = createMockSpan({
				spanKind: 'client',
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// User sees the span kind displayed
			expect(screen.getByText('span kind')).toBeInTheDocument();
			expect(screen.getByText('client')).toBeInTheDocument();

			// Find the span kind field item
			const spanKindItem = screen.getByText('span kind').closest('.item');
			expect(spanKindItem).toBeInTheDocument();

			// User hovers over the span kind field
			await user.hover(spanKindItem!);

			const filterOutButton = spanKindItem!.querySelector(
				'[aria-label="Filter out value"]',
			) as HTMLElement;
			expect(filterOutButton).toBeInTheDocument();

			// User clicks "Filter out value" button
			await user.click(filterOutButton);

			// Verify navigation to traces explorer with exclusion filter
			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									dataSource: 'traces',
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'spanKind' }),
												op: '!=',
												value: 'client',
											}),
										]),
									}),
								}),
							]),
						}),
					}),
					{},
					ROUTES.TRACES_EXPLORER,
				);
			});
		});
	});

	describe('Copy Actions Flow', () => {
		it('should allow user to copy field name and field value through popover actions', async () => {
			const testSpan = createMockSpan({
				statusCodeString: 'ERROR',
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// User sees the status code string displayed
			expect(screen.getByText('status code string')).toBeInTheDocument();
			expect(screen.getByText('ERROR')).toBeInTheDocument();

			// Find the status code string field item
			const statusCodeItem = screen
				.getByText('status code string')
				.closest('.item');
			expect(statusCodeItem).toBeInTheDocument();

			// User hovers over the field to reveal action buttons
			await user.hover(statusCodeItem!);

			// User clicks the more actions button (ellipsis)
			const moreActionsButton = statusCodeItem!
				.querySelector('.lucide-ellipsis')
				?.closest('button') as HTMLElement;
			expect(moreActionsButton).toBeInTheDocument();
			await user.click(moreActionsButton);

			// Verify popover opens with copy options
			await waitFor(() => {
				expect(screen.getByText('Copy Field Name')).toBeInTheDocument();
				expect(screen.getByText('Copy Field Value')).toBeInTheDocument();
			});

			// User clicks "Copy Field Name"
			const copyFieldNameButton = screen.getByText('Copy Field Name');
			fireEvent.click(copyFieldNameButton);

			// Verify field name is copied with correct mapping
			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('statusCodeString');
				expect(mockNotifications.success).toHaveBeenCalledWith({
					message: 'Field name copied to clipboard',
				});
			});

			// Reset mocks and test copy field value
			mockSetCopy.mockClear();
			mockNotifications.success.mockClear();

			// Open popover again for copy field value test
			await user.hover(statusCodeItem!);
			await user.click(moreActionsButton);

			await waitFor(() => {
				expect(screen.getByText('Copy Field Value')).toBeInTheDocument();
			});

			// User clicks "Copy Field Value"
			const copyFieldValueButton = screen.getByText('Copy Field Value');
			fireEvent.click(copyFieldValueButton);

			// Verify field value is copied
			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('ERROR');
				expect(mockNotifications.success).toHaveBeenCalledWith({
					message: 'Field value copied to clipboard',
				});
			});
		});
	});

	describe('Multiple Standard Fields', () => {
		it('should work consistently across different field types with proper field mappings', async () => {
			const testSpan = createMockSpan({
				spanId: 'abc123def456',
				name: 'Database Query',
				serviceName: 'db-service',
				spanKind: 'internal',
				statusCodeString: 'OK',
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// Test span ID field with its mapping
			const spanIdItem = screen.getByText('span id').closest('.item');
			await user.hover(spanIdItem!);
			const spanIdFilterButton = spanIdItem!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			await user.click(spanIdFilterButton);

			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'span_id' }),
												op: '=',
												value: 'abc123def456',
											}),
										]),
									}),
								}),
							]),
						}),
					}),
					{},
					ROUTES.TRACES_EXPLORER,
				);
			});

			mockRedirectWithQueryBuilderData.mockClear();

			// Test span name field
			const spanNameItem = screen.getByText('span name').closest('.item');
			await user.hover(spanNameItem!);
			const spanNameFilterButton = spanNameItem!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			await user.click(spanNameFilterButton);

			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'name' }),
												op: '=',
												value: 'Database Query',
											}),
										]),
									}),
								}),
							]),
						}),
					}),
					{},
					ROUTES.TRACES_EXPLORER,
				);
			});
		});
	});

	describe('Special Field Values', () => {
		it('should handle duration field with numeric values properly', async () => {
			const testSpan = createMockSpan({
				durationNano: 250000000, // 250ms
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// User sees the duration displayed (formatted)
			expect(screen.getByText('duration')).toBeInTheDocument();
			// Duration should be formatted by getYAxisFormattedValue, but we test the raw value is used in filter

			// Find the duration field item
			const durationItem = screen.getByText('duration').closest('.item');
			expect(durationItem).toBeInTheDocument();

			// User hovers and clicks filter for
			await user.hover(durationItem!);
			const filterForButton = durationItem!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			await user.click(filterForButton);

			// Verify the raw numeric value is used in the filter, not the formatted display value
			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									dataSource: 'traces',
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'durationNano' }),
												op: '=',
												value: '250000000', // Raw numeric value as string
											}),
										]),
									}),
								}),
							]),
						}),
					}),
					{},
					ROUTES.TRACES_EXPLORER,
				);
			});
		});

		it('should handle fields with special characters and preserve exact field values', async () => {
			const testSpan = createMockSpan({
				name: 'POST /api/users/create',
				statusCodeString: '"INTERNAL_ERROR"', // Quoted value to test exact preservation
			});
			const { user } = renderSpanDetailsDrawer(testSpan);

			// Test span name with special characters
			const spanNameItem = screen.getByText('span name').closest('.item');
			await user.hover(spanNameItem!);
			const moreActionsButton = spanNameItem!
				.querySelector('.lucide-ellipsis')
				?.closest('button') as HTMLElement;
			await user.click(moreActionsButton);

			await waitFor(() => {
				expect(screen.getByText('Copy Field Value')).toBeInTheDocument();
			});

			const copyFieldValueButton = screen.getByText('Copy Field Value');
			fireEvent.click(copyFieldValueButton);

			// Verify special characters are handled correctly
			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('POST /api/users/create');
			});

			// Reset and test quoted value handling
			mockSetCopy.mockClear();

			// Test status code string with quotes (should preserve exact value)
			const statusItem = screen.getByText('status code string').closest('.item');
			await user.hover(statusItem!);
			const statusMoreActionsButton = statusItem!
				.querySelector('.lucide-ellipsis')
				?.closest('button') as HTMLElement;
			await user.click(statusMoreActionsButton);

			await waitFor(() => {
				expect(screen.getByText('Copy Field Value')).toBeInTheDocument();
			});

			const statusCopyButton = screen.getByText('Copy Field Value');
			fireEvent.click(statusCopyButton);

			// Verify exact field value is preserved (including quotes)
			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('"INTERNAL_ERROR"');
			});
		});
	});
});
