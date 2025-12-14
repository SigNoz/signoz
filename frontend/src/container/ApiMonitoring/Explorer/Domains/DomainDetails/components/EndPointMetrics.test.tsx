/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable prefer-destructuring */
/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen, waitFor } from '@testing-library/react';
import { getEndPointDetailsQueryPayload } from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { QueryClient, QueryClientProvider, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

import EndPointMetrics from './EndPointMetrics';

// Mock the API call
jest.mock('lib/dashboard/getQueryResults', () => ({
	GetMetricQueryRange: jest.fn(),
}));

// Mock ErrorState component
jest.mock('./ErrorState', () => ({
	__esModule: true,
	default: jest.fn(({ refetch }) => (
		<div data-testid="error-state">
			<button type="button" onClick={refetch} data-testid="retry-button">
				Retry
			</button>
		</div>
	)),
}));

describe('EndPointMetrics - V5 Query Payload Tests', () => {
	let queryClient: QueryClient;

	const mockSuccessResponse = {
		statusCode: 200,
		error: null,
		payload: {
			data: {
				result: [
					{
						table: {
							rows: [
								{
									data: {
										A: '85.5',
										B: '245000000',
										D: '2021-01-01T22:30:00Z',
										F1: '3.2',
									},
								},
							],
						},
					},
				],
			},
		},
	};

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					cacheTime: 0,
				},
			},
		});
		jest.clearAllMocks();
	});

	afterEach(() => {
		queryClient.clear();
	});

	// Helper to create mock query result
	const createMockQueryResult = (
		response: any,
		overrides?: Partial<UseQueryResult<SuccessResponse<any>, unknown>>,
	): UseQueryResult<SuccessResponse<any>, unknown> =>
		({
			data: response,
			error: null,
			isError: false,
			isIdle: false,
			isLoading: false,
			isLoadingError: false,
			isRefetchError: false,
			isRefetching: false,
			isStale: true,
			isSuccess: true,
			status: 'success' as const,
			dataUpdatedAt: Date.now(),
			errorUpdateCount: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isFetching: false,
			isPlaceholderData: false,
			isPreviousData: false,
			refetch: jest.fn(),
			remove: jest.fn(),
			...overrides,
		} as UseQueryResult<SuccessResponse<any>, unknown>);

	const renderComponent = (
		endPointMetricsDataQuery: UseQueryResult<SuccessResponse<any>, unknown>,
	): ReturnType<typeof render> =>
		render(
			<QueryClientProvider client={queryClient}>
				<EndPointMetrics endPointMetricsDataQuery={endPointMetricsDataQuery} />
			</QueryClientProvider>,
		);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	describe('1. V5 Query Payload with Filters', () => {
		// eslint-disable-next-line sonarjs/cognitive-complexity
		it('sends correct V5 payload structure with domain and endpoint filters', async () => {
			(GetMetricQueryRange as jest.Mock).mockResolvedValue(mockSuccessResponse);

			const domainName = 'api.example.com';
			const startTime = 1758259531000;
			const endTime = 1758261331000;
			const filters = {
				items: [],
				op: 'AND' as const,
			};

			// Get the actual payload that would be generated
			const payloads = getEndPointDetailsQueryPayload(
				domainName,
				startTime,
				endTime,
				filters,
			);

			// First payload is for endpoint metrics
			const metricsPayload = payloads[0];

			// Verify it's using the correct structure (V3 format for V5 API)
			expect(metricsPayload.query).toBeDefined();
			expect(metricsPayload.query.builder).toBeDefined();
			expect(metricsPayload.query.builder.queryData).toBeDefined();

			const queryData = metricsPayload.query.builder.queryData;

			// Verify Query A - rate with domain and client kind filters
			const queryA = queryData.find((q: any) => q.queryName === 'A');
			expect(queryA).toBeDefined();
			if (queryA) {
				expect(queryA.dataSource).toBe('traces');
				expect(queryA.aggregateOperator).toBe('rate');
				expect(queryA.timeAggregation).toBe('rate');
				// Verify exact domain filter expression structure
				if (queryA.filter) {
					expect(queryA.filter.expression).toContain(
						"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com')",
					);
					expect(queryA.filter.expression).toContain("kind_string = 'Client'");
				}
			}

			// Verify Query B - p99 latency with duration_nano
			const queryB = queryData.find((q: any) => q.queryName === 'B');
			expect(queryB).toBeDefined();
			if (queryB) {
				expect(queryB.aggregateOperator).toBe('p99');
				if (queryB.aggregateAttribute) {
					expect(queryB.aggregateAttribute.key).toBe('duration_nano');
				}
				expect(queryB.timeAggregation).toBe('p99');
				// Verify exact domain filter expression structure
				if (queryB.filter) {
					expect(queryB.filter.expression).toContain(
						"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com')",
					);
					expect(queryB.filter.expression).toContain("kind_string = 'Client'");
				}
			}

			// Verify Query C - error count (disabled)
			const queryC = queryData.find((q: any) => q.queryName === 'C');
			expect(queryC).toBeDefined();
			if (queryC) {
				expect(queryC.disabled).toBe(true);
				expect(queryC.aggregateOperator).toBe('count');
				if (queryC.filter) {
					expect(queryC.filter.expression).toContain(
						"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com')",
					);
					expect(queryC.filter.expression).toContain("kind_string = 'Client'");
					expect(queryC.filter.expression).toContain('has_error = true');
				}
			}

			// Verify Query D - max timestamp for last used
			const queryD = queryData.find((q: any) => q.queryName === 'D');
			expect(queryD).toBeDefined();
			if (queryD) {
				expect(queryD.aggregateOperator).toBe('max');
				if (queryD.aggregateAttribute) {
					expect(queryD.aggregateAttribute.key).toBe('timestamp');
				}
				expect(queryD.timeAggregation).toBe('max');
				// Verify exact domain filter expression structure
				if (queryD.filter) {
					expect(queryD.filter.expression).toContain(
						"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com')",
					);
					expect(queryD.filter.expression).toContain("kind_string = 'Client'");
				}
			}

			// Verify Query E - total count (disabled)
			const queryE = queryData.find((q: any) => q.queryName === 'E');
			expect(queryE).toBeDefined();
			if (queryE) {
				expect(queryE.disabled).toBe(true);
				expect(queryE.aggregateOperator).toBe('count');
				if (queryE.aggregateAttribute) {
					expect(queryE.aggregateAttribute.key).toBe('span_id');
				}
				if (queryE.filter) {
					expect(queryE.filter.expression).toContain(
						"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com')",
					);
					expect(queryE.filter.expression).toContain("kind_string = 'Client'");
				}
			}

			// Verify Formula F1 - error rate calculation
			const formulas = metricsPayload.query.builder.queryFormulas;
			expect(formulas).toBeDefined();
			expect(formulas.length).toBeGreaterThan(0);
			const formulaF1 = formulas.find((f: any) => f.queryName === 'F1');
			expect(formulaF1).toBeDefined();
			if (formulaF1) {
				expect(formulaF1.expression).toBe('(C/E)*100');
				expect(formulaF1.disabled).toBe(false);
				expect(formulaF1.legend).toBe('error percentage');
			}
		});

		it('includes custom domainListFilters in all query expressions', async () => {
			(GetMetricQueryRange as jest.Mock).mockResolvedValue(mockSuccessResponse);

			const customFilters = {
				items: [
					{
						id: 'test-1',
						key: {
							key: 'service.name',
							dataType: 'string' as any,
							type: 'resource',
						},
						op: '=',
						value: 'payment-service',
					},
					{
						id: 'test-2',
						key: {
							key: 'deployment.environment',
							dataType: 'string' as any,
							type: 'resource',
						},
						op: '=',
						value: 'staging',
					},
				],
				op: 'AND' as const,
			};

			const payloads = getEndPointDetailsQueryPayload(
				'api.internal.com',
				1758259531000,
				1758261331000,
				customFilters,
			);

			const queryData = payloads[0].query.builder.queryData;

			// Verify ALL queries (A, B, C, D, E) include the custom filters
			const allQueryNames = ['A', 'B', 'C', 'D', 'E'];
			allQueryNames.forEach((queryName) => {
				const query = queryData.find((q: any) => q.queryName === queryName);
				expect(query).toBeDefined();
				if (query && query.filter && query.filter.expression) {
					// Check for exact filter inclusion
					expect(query.filter.expression).toContain('service.name');
					expect(query.filter.expression).toContain('payment-service');
					expect(query.filter.expression).toContain('deployment.environment');
					expect(query.filter.expression).toContain('staging');
					// Also verify domain filter is still present
					expect(query.filter.expression).toContain(
						"(net.peer.name = 'api.internal.com' OR server.address = 'api.internal.com')",
					);
					// Verify client kind filter is present
					expect(query.filter.expression).toContain("kind_string = 'Client'");
				}
			});
		});
	});

	describe('2. Data Display State', () => {
		it('displays metrics when data is successfully loaded', async () => {
			const mockQuery = createMockQueryResult(mockSuccessResponse);

			renderComponent(mockQuery);

			// Wait for skeletons to disappear
			await waitFor(() => {
				const skeletons = document.querySelectorAll('.ant-skeleton-button');
				expect(skeletons.length).toBe(0);
			});

			// Verify all metric labels are displayed
			expect(screen.getByText('Rate')).toBeInTheDocument();
			expect(screen.getByText('AVERAGE LATENCY')).toBeInTheDocument();
			expect(screen.getByText('ERROR %')).toBeInTheDocument();
			expect(screen.getByText('LAST USED')).toBeInTheDocument();

			// Verify metric values are displayed
			expect(screen.getByText('85.5 ops/sec')).toBeInTheDocument();
			expect(screen.getByText('245ms')).toBeInTheDocument();
		});
	});

	describe('3. Empty/Missing Data State', () => {
		it("displays '-' for missing data values", async () => {
			const emptyResponse = {
				statusCode: 200,
				error: null,
				payload: {
					data: {
						result: [
							{
								table: {
									rows: [],
								},
							},
						],
					},
				},
			};

			const mockQuery = createMockQueryResult(emptyResponse);

			renderComponent(mockQuery);

			await waitFor(() => {
				const skeletons = document.querySelectorAll('.ant-skeleton-button');
				expect(skeletons.length).toBe(0);
			});

			// When no data, all values should show "-"
			const dashValues = screen.getAllByText('-');
			// Should have at least 2 dashes (rate and last used - latency shows "-", error % shows progress bar)
			expect(dashValues.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('4. Error State', () => {
		it('displays error state when API call fails', async () => {
			const mockQuery = createMockQueryResult(null, {
				isError: true,
				isSuccess: false,
				status: 'error',
				error: new Error('API Error'),
			});

			renderComponent(mockQuery);

			await waitFor(() => {
				expect(screen.getByTestId('error-state')).toBeInTheDocument();
			});

			expect(screen.getByTestId('retry-button')).toBeInTheDocument();
		});

		it('retries API call when retry button is clicked', async () => {
			const refetch = jest.fn().mockResolvedValue(mockSuccessResponse);

			// Start with error state
			const mockQuery = createMockQueryResult(null, {
				isError: true,
				isSuccess: false,
				status: 'error',
				error: new Error('API Error'),
				refetch,
			});

			const { rerender } = renderComponent(mockQuery);

			// Wait for error state
			await waitFor(() => {
				expect(screen.getByTestId('error-state')).toBeInTheDocument();
			});

			// Click retry
			const retryButton = screen.getByTestId('retry-button');
			retryButton.click();

			// Verify refetch was called
			expect(refetch).toHaveBeenCalledTimes(1);

			// Simulate successful refetch by rerendering with success state
			const successQuery = createMockQueryResult(mockSuccessResponse);
			rerender(
				<QueryClientProvider client={queryClient}>
					<EndPointMetrics endPointMetricsDataQuery={successQuery} />
				</QueryClientProvider>,
			);

			// Wait for successful load
			await waitFor(() => {
				expect(screen.getByText('85.5 ops/sec')).toBeInTheDocument();
			});
		});
	});
});
