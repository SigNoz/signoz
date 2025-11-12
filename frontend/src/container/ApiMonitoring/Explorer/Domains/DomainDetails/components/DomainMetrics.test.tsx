/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable prefer-destructuring */
/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen, waitFor } from '@testing-library/react';
import { TraceAggregation } from 'api/v5/v5';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { QueryClient, QueryClientProvider } from 'react-query';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import DomainMetrics from './DomainMetrics';

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

describe('DomainMetrics - V5 Query Payload Tests', () => {
	let queryClient: QueryClient;

	const mockProps = {
		domainName: '0.0.0.0',
		timeRange: {
			startTime: 1758259531000,
			endTime: 1758261331000,
		},
		domainListFilters: {
			items: [],
			op: 'AND' as const,
		} as IBuilderQuery['filters'],
	};

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
										A: '150',
										B: '125000000',
										D: '2021-01-01T23:00:00Z',
										F1: '5.5',
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

	const renderComponent = (props = mockProps): ReturnType<typeof render> =>
		render(
			<QueryClientProvider client={queryClient}>
				<DomainMetrics {...props} />
			</QueryClientProvider>,
		);

	describe('1. V5 Query Payload with Filters', () => {
		it('sends correct V5 payload structure with domain name filters', async () => {
			(GetMetricQueryRange as jest.Mock).mockResolvedValue(mockSuccessResponse);

			renderComponent();

			await waitFor(() => {
				expect(GetMetricQueryRange).toHaveBeenCalledTimes(1);
			});

			const [payload, version] = (GetMetricQueryRange as jest.Mock).mock.calls[0];

			// Verify it's using V5
			expect(version).toBe(ENTITY_VERSION_V5);

			// Verify time range
			expect(payload.start).toBe(1758259531000);
			expect(payload.end).toBe(1758261331000);

			// Verify V3 payload structure (getDomainMetricsQueryPayload returns V3 format)
			expect(payload.query).toBeDefined();
			expect(payload.query.builder).toBeDefined();
			expect(payload.query.builder.queryData).toBeDefined();

			const queryData = payload.query.builder.queryData;

			// Verify Query A - count with URL filter
			const queryA = queryData.find((q: any) => q.queryName === 'A');
			expect(queryA).toBeDefined();
			expect(queryA.dataSource).toBe('traces');
			expect(queryA.aggregations?.[0]).toBeDefined();
			expect((queryA.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'count()',
			);
			// Verify exact domain filter expression structure
			expect(queryA.filter.expression).toContain(
				"(net.peer.name = '0.0.0.0' OR server.address = '0.0.0.0')",
			);
			expect(queryA.filter.expression).toContain(
				'url.full EXISTS OR http.url EXISTS',
			);

			// Verify Query B - p99 latency
			const queryB = queryData.find((q: any) => q.queryName === 'B');
			expect(queryB).toBeDefined();
			expect(queryB.aggregateOperator).toBe('p99');
			expect(queryB.aggregations?.[0]).toBeDefined();
			expect((queryB.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'p99(duration_nano)',
			);
			// Verify exact domain filter expression structure
			expect(queryB.filter.expression).toContain(
				"(net.peer.name = '0.0.0.0' OR server.address = '0.0.0.0')",
			);

			// Verify Query C - error count (disabled)
			const queryC = queryData.find((q: any) => q.queryName === 'C');
			expect(queryC).toBeDefined();
			expect(queryC.disabled).toBe(true);
			expect(queryC.filter.expression).toContain(
				"(net.peer.name = '0.0.0.0' OR server.address = '0.0.0.0')",
			);
			expect(queryC.aggregations?.[0]).toBeDefined();
			expect((queryC.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'count()',
			);

			expect(queryC.filter.expression).toContain('has_error = true');

			// Verify Query D - max timestamp
			const queryD = queryData.find((q: any) => q.queryName === 'D');
			expect(queryD).toBeDefined();
			expect(queryD.aggregateOperator).toBe('max');
			expect(queryD.aggregations?.[0]).toBeDefined();
			expect((queryD.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'max(timestamp)',
			);
			// Verify exact domain filter expression structure
			expect(queryD.filter.expression).toContain(
				"(net.peer.name = '0.0.0.0' OR server.address = '0.0.0.0')",
			);

			// Verify Formula F1 - error rate calculation
			const formulas = payload.query.builder.queryFormulas;
			expect(formulas).toBeDefined();
			expect(formulas.length).toBeGreaterThan(0);
			const formulaF1 = formulas.find((f: any) => f.queryName === 'F1');
			expect(formulaF1).toBeDefined();
			expect(formulaF1.expression).toBe('(C/A)*100');
		});

		it('includes custom filters in filter expressions', async () => {
			(GetMetricQueryRange as jest.Mock).mockResolvedValue(mockSuccessResponse);

			const customFilters: IBuilderQuery['filters'] = {
				items: [
					{
						id: 'test-1',
						key: {
							key: 'service.name',
							dataType: 'string' as any,
							type: 'resource',
						},
						op: '=',
						value: 'my-service',
					},
					{
						id: 'test-2',
						key: {
							key: 'deployment.environment',
							dataType: 'string' as any,
							type: 'resource',
						},
						op: '=',
						value: 'production',
					},
				],
				op: 'AND' as const,
			};

			renderComponent({
				...mockProps,
				domainListFilters: customFilters,
			});

			await waitFor(() => {
				expect(GetMetricQueryRange).toHaveBeenCalled();
			});

			const [payload] = (GetMetricQueryRange as jest.Mock).mock.calls[0];
			const queryData = payload.query.builder.queryData;

			// Verify all queries include the custom filters
			queryData.forEach((query: any) => {
				if (query.filter && query.filter.expression) {
					expect(query.filter.expression).toContain('service.name');
					expect(query.filter.expression).toContain('my-service');
					expect(query.filter.expression).toContain('deployment.environment');
					expect(query.filter.expression).toContain('production');
				}
			});
		});
	});

	describe('2. Data Display State', () => {
		it('displays metrics when data is successfully loaded', async () => {
			(GetMetricQueryRange as jest.Mock).mockResolvedValue(mockSuccessResponse);

			renderComponent();

			// Wait for skeletons to disappear
			await waitFor(() => {
				const skeletons = document.querySelectorAll('.ant-skeleton-button');
				expect(skeletons.length).toBe(0);
			});

			// Verify all metric labels are displayed
			expect(screen.getByText('EXTERNAL API')).toBeInTheDocument();
			expect(screen.getByText('AVERAGE LATENCY')).toBeInTheDocument();
			expect(screen.getByText('ERROR %')).toBeInTheDocument();
			expect(screen.getByText('LAST USED')).toBeInTheDocument();

			// Verify metric values are displayed
			expect(screen.getByText('150')).toBeInTheDocument();
			expect(screen.getByText('0.125s')).toBeInTheDocument();
		});
	});

	describe('3. Empty/Missing Data State', () => {
		it('displays "-" for missing data values', async () => {
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

			(GetMetricQueryRange as jest.Mock).mockResolvedValue(emptyResponse);

			renderComponent();

			await waitFor(() => {
				const skeletons = document.querySelectorAll('.ant-skeleton-button');
				expect(skeletons.length).toBe(0);
			});

			// When no data, all values should show "-"
			const dashValues = screen.getAllByText('-');
			expect(dashValues.length).toBeGreaterThan(0);
		});
	});

	describe('4. Error State', () => {
		it('displays error state when API call fails', async () => {
			(GetMetricQueryRange as jest.Mock).mockRejectedValue(new Error('API Error'));

			renderComponent();

			await waitFor(() => {
				expect(screen.getByTestId('error-state')).toBeInTheDocument();
			});

			expect(screen.getByTestId('retry-button')).toBeInTheDocument();
		});

		it('retries API call when retry button is clicked', async () => {
			let callCount = 0;
			(GetMetricQueryRange as jest.Mock).mockImplementation(() => {
				callCount += 1;
				if (callCount === 1) {
					return Promise.reject(new Error('API Error'));
				}
				return Promise.resolve(mockSuccessResponse);
			});

			renderComponent();

			// Wait for error state
			await waitFor(() => {
				expect(screen.getByTestId('error-state')).toBeInTheDocument();
			});

			// Click retry
			const retryButton = screen.getByTestId('retry-button');
			retryButton.click();

			// Wait for successful load
			await waitFor(() => {
				expect(screen.getByText('150')).toBeInTheDocument();
			});

			expect(callCount).toBe(2);
		});
	});
});
