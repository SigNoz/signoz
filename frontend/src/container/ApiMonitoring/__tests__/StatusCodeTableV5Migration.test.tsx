/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
/**
 * V5 Migration Tests for Status Code Table Query
 *
 * These tests validate the migration from V4 to V5 format for the second payload
 * in getEndPointDetailsQueryPayload (status code table data):
 * - Filter format change: filters.items[] → filter.expression
 * - URL handling: Special logic for (http.url OR url.full)
 * - Domain filter: (net.peer.name OR server.address)
 * - Kind filter: kind_string = 'Client'
 * - Kind filter: response_status_code EXISTS
 * - Three queries: A (count), B (p99 latency), C (rate)
 * - All grouped by response_status_code
 */
import { TraceAggregation } from 'api/v5/v5';
import { getEndPointDetailsQueryPayload } from 'container/ApiMonitoring/utils';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

describe('StatusCodeTable - V5 Migration Validation', () => {
	const mockDomainName = 'api.example.com';
	const mockStartTime = 1000;
	const mockEndTime = 2000;
	const emptyFilters: IBuilderQuery['filters'] = {
		items: [],
		op: 'AND',
	};

	describe('1. V5 Format Migration with Base Filters', () => {
		it('migrates to V5 format with correct filter expression structure and base filters', () => {
			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				emptyFilters,
			);

			// Second payload is the status code table query
			const statusCodeQuery = payload[1];
			const queryA = statusCodeQuery.query.builder.queryData[0];

			// CRITICAL V5 MIGRATION: filter.expression (not filters.items)
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

			// Base filter 3: response_status_code EXISTS
			expect(queryA.filter?.expression).toContain('response_status_code EXISTS');
		});
	});

	describe('2. Three Queries Structure and Consistency', () => {
		it('generates three queries (count, p99, rate) all grouped by response_status_code with identical filters', () => {
			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				emptyFilters,
			);

			const statusCodeQuery = payload[1];
			const [queryA, queryB, queryC] = statusCodeQuery.query.builder.queryData;

			// Query A: Count
			expect(queryA.queryName).toBe('A');
			expect(queryA.aggregateOperator).toBe('count');
			expect(queryA.aggregations?.[0]).toBeDefined();
			expect((queryA.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'count(span_id)',
			);
			expect(queryA.disabled).toBe(false);

			// Query B: P99 Latency
			expect(queryB.queryName).toBe('B');
			expect(queryB.aggregateOperator).toBe('p99');
			expect((queryB.aggregations?.[0] as TraceAggregation)?.expression).toBe(
				'p99(duration_nano)',
			);
			expect(queryB.disabled).toBe(false);

			// Query C: Rate
			expect(queryC.queryName).toBe('C');
			expect(queryC.aggregateOperator).toBe('rate');
			expect(queryC.disabled).toBe(false);

			// All group by response_status_code
			[queryA, queryB, queryC].forEach((query) => {
				expect(query.groupBy).toContainEqual(
					expect.objectContaining({
						key: 'response_status_code',
						dataType: 'string',
						type: 'span',
					}),
				);
			});

			// CRITICAL: All have identical filter expressions
			expect(queryA.filter?.expression).toBe(queryB.filter?.expression);
			expect(queryB.filter?.expression).toBe(queryC.filter?.expression);
		});
	});

	describe('3. Custom Filters Integration', () => {
		it('merges custom filters into filter expression with AND logic', () => {
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

			const statusCodeQuery = payload[1];
			const expression =
				statusCodeQuery.query.builder.queryData[0].filter?.expression;

			// Base filters present
			expect(expression).toContain('net.peer.name');
			expect(expression).toContain("kind_string = 'Client'");
			expect(expression).toContain('response_status_code EXISTS');

			// Custom filters merged
			expect(expression).toContain('service.name');
			expect(expression).toContain('user-service');
			expect(expression).toContain('deployment.environment');
			expect(expression).toContain('production');

			// All three queries have the same merged expression
			const queries = statusCodeQuery.query.builder.queryData;
			expect(queries[0].filter?.expression).toBe(queries[1].filter?.expression);
			expect(queries[1].filter?.expression).toBe(queries[2].filter?.expression);
		});
	});

	describe('4. HTTP URL Filter Handling', () => {
		it('converts http.url filter to (http.url OR url.full) expression', () => {
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
						value: '/api/users',
					},
					{
						id: 'service-filter',
						key: {
							key: 'service.name',
							dataType: 'string' as any,
							type: 'resource',
						},
						op: '=',
						value: 'user-service',
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

			const statusCodeQuery = payload[1];
			const expression =
				statusCodeQuery.query.builder.queryData[0].filter?.expression;

			// CRITICAL: http.url converted to OR logic
			expect(expression).toContain(
				"(http.url = '/api/users' OR url.full = '/api/users')",
			);

			// Other filters still present
			expect(expression).toContain('service.name');
			expect(expression).toContain('user-service');

			// Base filters present
			expect(expression).toContain('net.peer.name');
			expect(expression).toContain("kind_string = 'Client'");
			expect(expression).toContain('response_status_code EXISTS');

			// All ANDed together (at least 2 ANDs: domain+kind, custom filter, url condition)
			expect(expression?.match(/AND/g)?.length).toBeGreaterThanOrEqual(2);
		});
	});
});
