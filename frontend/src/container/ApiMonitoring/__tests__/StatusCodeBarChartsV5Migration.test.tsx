/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
/**
 * V5 Migration Tests for Status Code Bar Chart Queries
 *
 * These tests validate the migration to V5 format for the bar chart payloads
 * in getEndPointDetailsQueryPayload (5th and 6th payloads):
 * - Number of Calls Chart (count aggregation)
 * - Latency Chart (p99 aggregation)
 *
 * V5 Changes:
 * - Filter format change: filters.items[] → filter.expression
 * - Domain filter: (net.peer.name OR server.address)
 * - Kind filter: kind_string = 'Client'
 * - stepInterval: 60 → null
 * - Grouped by response_status_code
 */
import { TraceAggregation } from 'api/v5/v5';
import { getEndPointDetailsQueryPayload } from 'container/ApiMonitoring/utils';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

describe('StatusCodeBarCharts - V5 Migration Validation', () => {
	const mockDomainName = '0.0.0.0';
	const mockStartTime = 1762573673000;
	const mockEndTime = 1762832873000;
	const emptyFilters: IBuilderQuery['filters'] = {
		items: [],
		op: 'AND',
	};

	describe('1. Number of Calls Chart - V5 Payload Structure', () => {
		it('generates correct V5 payload for count aggregation grouped by status code', () => {
			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				emptyFilters,
			);

			// 5th payload (index 4) is the number of calls bar chart
			const callsChartQuery = payload[4];
			const queryA = callsChartQuery.query.builder.queryData[0];

			// V5 format: filter.expression (not filters.items)
			expect(queryA.filter).toBeDefined();
			expect(queryA.filter?.expression).toBeDefined();
			expect(typeof queryA.filter?.expression).toBe('string');
			expect(queryA).not.toHaveProperty('filters.items');

			// Base filter 1: Domain (net.peer.name OR server.address)
			expect(queryA.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}')`,
			);

			// Base filter 2: Kind
			expect(queryA.filter?.expression).toContain("kind_string = 'Client'");

			// Aggregation: count
			expect(queryA.queryName).toBe('A');
			expect(queryA.aggregateOperator).toBe('count');
			expect(queryA.disabled).toBe(false);

			// Grouped by response_status_code
			expect(queryA.groupBy).toContainEqual(
				expect.objectContaining({
					key: 'response_status_code',
					dataType: 'string',
					type: 'span',
				}),
			);

			// V5 critical: stepInterval should be null
			expect(queryA.stepInterval).toBeNull();

			// Time aggregation
			expect(queryA.timeAggregation).toBe('rate');
		});
	});

	describe('2. Latency Chart - V5 Payload Structure', () => {
		it('generates correct V5 payload for p99 aggregation grouped by status code', () => {
			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				emptyFilters,
			);

			// 6th payload (index 5) is the latency bar chart
			const latencyChartQuery = payload[5];
			const queryA = latencyChartQuery.query.builder.queryData[0];

			// V5 format: filter.expression (not filters.items)
			expect(queryA.filter).toBeDefined();
			expect(queryA.filter?.expression).toBeDefined();
			expect(typeof queryA.filter?.expression).toBe('string');
			expect(queryA).not.toHaveProperty('filters.items');

			// Base filter 1: Domain (net.peer.name OR server.address)
			expect(queryA.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}')`,
			);

			// Base filter 2: Kind
			expect(queryA.filter?.expression).toContain("kind_string = 'Client'");

			// Aggregation: p99 on duration_nano
			expect(queryA.queryName).toBe('A');
			expect(queryA.aggregateOperator).toBe('p99');
			expect(queryA.aggregations?.[0]).toBeDefined();
			expect((queryA.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'p99(duration_nano)',
			);
			expect(queryA.disabled).toBe(false);

			// Grouped by response_status_code
			expect(queryA.groupBy).toContainEqual(
				expect.objectContaining({
					key: 'response_status_code',
					dataType: 'string',
					type: 'span',
				}),
			);

			// V5 critical: stepInterval should be null
			expect(queryA.stepInterval).toBeNull();

			// Time aggregation
			expect(queryA.timeAggregation).toBe('p99');
		});
	});

	describe('3. Custom Filters Integration', () => {
		it('merges custom filters into filter expression for both charts', () => {
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
						value: 'user-service',
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
				op: 'AND',
			};

			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				customFilters,
			);

			const callsChartQuery = payload[4];
			const latencyChartQuery = payload[5];

			const callsExpression =
				callsChartQuery.query.builder.queryData[0].filter?.expression;
			const latencyExpression =
				latencyChartQuery.query.builder.queryData[0].filter?.expression;

			// Both charts should have the same filter expression
			expect(callsExpression).toBe(latencyExpression);

			// Verify base filters
			expect(callsExpression).toContain('net.peer.name');
			expect(callsExpression).toContain("kind_string = 'Client'");

			// Verify custom filters are merged
			expect(callsExpression).toContain('service.name');
			expect(callsExpression).toContain('user-service');
			expect(callsExpression).toContain('deployment.environment');
			expect(callsExpression).toContain('production');
		});
	});

	describe('4. HTTP URL Filter Handling', () => {
		it('converts http.url filter to (http.url OR url.full) expression in both charts', () => {
			const filtersWithHttpUrl: IBuilderQuery['filters'] = {
				items: [
					{
						id: 'http-url-filter',
						key: {
							key: 'http.url',
							dataType: 'string' as any,
							type: 'tag',
						},
						op: '=',
						value: '/api/metrics',
					},
				],
				op: 'AND',
			};

			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				filtersWithHttpUrl,
			);

			const callsChartQuery = payload[4];
			const latencyChartQuery = payload[5];

			const callsExpression =
				callsChartQuery.query.builder.queryData[0].filter?.expression;
			const latencyExpression =
				latencyChartQuery.query.builder.queryData[0].filter?.expression;

			// CRITICAL: http.url converted to OR logic
			expect(callsExpression).toContain(
				"(http.url = '/api/metrics' OR url.full = '/api/metrics')",
			);
			expect(latencyExpression).toContain(
				"(http.url = '/api/metrics' OR url.full = '/api/metrics')",
			);

			// Base filters still present
			expect(callsExpression).toContain('net.peer.name');
			expect(callsExpression).toContain("kind_string = 'Client'");
		});
	});
});
