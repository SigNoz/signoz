import { MemoryRouter, Route } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { SPAN_ATTRIBUTES } from 'container/ApiMonitoring/Explorer/Domains/DomainDetails/constants';
import { AppProvider } from 'providers/App/App';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { Span } from 'types/api/trace/getTraceV2';

import SpanDetailsDrawer from '../SpanDetailsDrawer';

// Mock external dependencies
const mockRedirectWithQueryBuilderData = jest.fn();
const mockNotifications = {
	success: jest.fn(),
	error: jest.fn(),
};
const mockSetCopy = jest.fn();
const mockQueryClient = {
	fetchQuery: jest.fn(),
};

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

// Mock the hooks
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

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: jest.fn(),
}));

// Mock the API response for getAggregateKeys
const mockAggregateKeysResponse = {
	payload: {
		attributeKeys: [
			{
				key: 'http.method',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
			},
			{
				key: 'service.name',
				dataType: 'string',
				type: 'resource',
				isColumn: true,
			},
		],
	},
};

beforeEach(() => {
	jest.clearAllMocks();
	mockQueryClient.fetchQuery.mockResolvedValue(mockAggregateKeysResponse);
});

// Mock trace data with realistic span attributes
const createMockSpan = (): Span => ({
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
		[SPAN_ATTRIBUTES.HTTP_URL]: '/api/users?page=1',
		'http.status_code': '200',
		'service.name': 'frontend-service',
		'span.kind': 'server',
		'user.id': '12345',
		'request.id': 'req-abc-123',
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
});
const renderSpanDetailsDrawer = (span: Span = createMockSpan()): any => {
	const user = userEvent.setup();

	const component = render(
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

	return { ...component, user };
};

describe('AttributeActions User Flow Tests', () => {
	// Todo: to fixed properly - failing with - due to timeout > 5000ms
	describe.skip('Complete Attribute Actions User Flow', () => {
		it('should allow user to interact with span attribute actions from trace detail page', async () => {
			renderSpanDetailsDrawer();

			// Verify Attributes tab is displayed with table view
			expect(screen.getByText('Attributes')).toBeInTheDocument();

			// Verify attributes are displayed
			expect(screen.getByText('http.method')).toBeInTheDocument();
			expect(screen.getByText('GET')).toBeInTheDocument();
			expect(screen.getByText('service.name')).toBeInTheDocument();
			expect(screen.getAllByText('frontend-service')[0]).toBeInTheDocument();

			// Find an attribute row to test actions on
			const httpMethodRow = screen.getByText('http.method').closest('.item');
			expect(httpMethodRow).toBeInTheDocument();

			// Action buttons are always mounted in the DOM (only CSS-hidden until :hover),
			// so we can query them directly without simulating a pointer hover.
			const actionButtons = httpMethodRow!.querySelector('.action-btn');
			expect(actionButtons).toBeInTheDocument();

			const filterForButton = httpMethodRow!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			const filterOutButton = httpMethodRow!.querySelector(
				'[aria-label="Filter out value"]',
			) as HTMLElement;
			expect(filterForButton).toBeInTheDocument();
			expect(filterOutButton).toBeInTheDocument();

			// Test "Filter for" action — use fireEvent to skip userEvent's pointer
			// simulation and the Antd Tooltip mouseEnterDelay timers it triggers.
			fireEvent.click(filterForButton);

			// Verify navigation to traces explorer with inclusive filter
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
												key: expect.objectContaining({ key: 'http.method' }),
												op: '=',
												value: 'GET',
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

			// Reset mock for next test
			mockRedirectWithQueryBuilderData.mockClear();

			// Test "Filter out" action
			fireEvent.click(filterOutButton);

			// Verify navigation to traces explorer with exclusive filter
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
												key: expect.objectContaining({ key: 'http.method' }),
												op: '!=',
												value: 'GET',
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

			// Verify more actions button exists (popover functionality is tested in unit tests)
			const moreActionsButton = httpMethodRow!
				.querySelector('.lucide-ellipsis')
				?.closest('button');
			expect(moreActionsButton).toBeInTheDocument();
		});
	});

	// Todo: to fixed properly - failing with - due to timeout > 5000ms
	describe.skip('Filter Replacement Flow', () => {
		it('should replace previous filter when applying multiple filters on same field', async () => {
			renderSpanDetailsDrawer();

			// Find the http.method attribute row
			const httpMethodRow = screen.getByText('http.method').closest('.item');
			expect(httpMethodRow).toBeInTheDocument();

			// Action buttons are always mounted (CSS-hidden until :hover, which jsdom
			// doesn't evaluate), so we can click them directly via fireEvent and skip
			// userEvent's pointer simulation + Antd Tooltip mouseEnterDelay timers.
			const filterForButton = httpMethodRow!.querySelector(
				'[aria-label="Filter for value"]',
			) as HTMLElement;
			expect(filterForButton).toBeInTheDocument();
			fireEvent.click(filterForButton);

			// Verify first filter was applied
			await waitFor(() => {
				expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
					expect.objectContaining({
						builder: expect.objectContaining({
							queryData: expect.arrayContaining([
								expect.objectContaining({
									filters: expect.objectContaining({
										items: expect.arrayContaining([
											expect.objectContaining({
												key: expect.objectContaining({ key: 'http.method' }),
												op: '=',
												value: 'GET',
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

			// Reset and simulate existing filter in current query
			mockRedirectWithQueryBuilderData.mockClear();

			// Apply second filter on same field (should replace, not accumulate)
			const filterOutButton = httpMethodRow!.querySelector(
				'[aria-label="Filter out value"]',
			) as HTMLElement;
			expect(filterOutButton).toBeInTheDocument();
			fireEvent.click(filterOutButton);

			// Verify the new call contains only the new filter (replacement behavior)
			await waitFor(() => {
				const lastCall =
					mockRedirectWithQueryBuilderData.mock.calls[
						mockRedirectWithQueryBuilderData.mock.calls.length - 1
					];
				const queryData = lastCall[0].builder.queryData[0];
				const httpMethodFilters = queryData.filters.items.filter(
					(item: any) => item.key.key === 'http.method',
				);

				// Should have only one filter for http.method (the new one)
				expect(httpMethodFilters).toHaveLength(1);
				expect(httpMethodFilters[0].op).toBe('!=');
				expect(httpMethodFilters[0].value).toBe('GET');
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle attributes with special characters and JSON values', async () => {
			const spanWithSpecialAttrs = createMockSpan();
			spanWithSpecialAttrs.tagMap = {
				'request.headers.content-type': 'application/json',
				'response.body': '{"status":"success","data":[]}',
				'trace.annotation': '"quoted_string_value"',
			};

			const { user } = renderSpanDetailsDrawer(spanWithSpecialAttrs);

			// Test attribute with dashes
			expect(screen.getByText('request.headers.content-type')).toBeInTheDocument();
			expect(screen.getByText('application/json')).toBeInTheDocument();

			// Test JSON value
			expect(screen.getByText('response.body')).toBeInTheDocument();

			// Test quoted string value - should remove surrounding quotes when copying
			const quotedAttrRow = screen.getByText('trace.annotation').closest('.item');
			await user.hover(quotedAttrRow!);

			const actionButtons = quotedAttrRow!.querySelectorAll('.action-btn button');
			const moreActionsButton = actionButtons[actionButtons.length - 1];
			await user.hover(moreActionsButton);

			await waitFor(() => {
				expect(screen.getByText('Copy Field Value')).toBeInTheDocument();
			});

			const copyFieldValueButton = screen.getByText('Copy Field Value');
			fireEvent.click(copyFieldValueButton);

			// Verify quotes are stripped from copied value
			await waitFor(() => {
				expect(mockSetCopy).toHaveBeenCalledWith('quoted_string_value');
			});
		});

		it('should handle empty attributes gracefully', async () => {
			const spanWithNoAttrs = createMockSpan();
			spanWithNoAttrs.tagMap = {};

			renderSpanDetailsDrawer(spanWithNoAttrs);

			// Verify no attributes message is displayed
			expect(
				screen.getByText('No attributes found for selected span'),
			).toBeInTheDocument();
		});
	});
});
