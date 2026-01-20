/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
/**
 * V5 Migration Tests for Endpoint Dropdown Query
 *
 * These tests validate the migration from V4 to V5 format for the third payload
 * in getEndPointDetailsQueryPayload (endpoint dropdown data):
 * - Filter format change: filters.items[] → filter.expression
 * - Domain handling: (net.peer.name OR server.address)
 * - Kind filter: kind_string = 'Client'
 * - Existence check: (http.url EXISTS OR url.full EXISTS)
 * - Aggregation: count() expression
 * - GroupBy: Both http.url AND url.full with type 'attribute'
 */
import { getEndPointDetailsQueryPayload } from 'container/ApiMonitoring/utils';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

describe('EndpointDropdown - V5 Migration Validation', () => {
	const mockDomainName = 'api.example.com';
	const mockStartTime = 1000;
	const mockEndTime = 2000;
	const emptyFilters: IBuilderQuery['filters'] = {
		items: [],
		op: 'AND',
	};

	describe('1. V5 Format Migration - Structure and Base Filters', () => {
		it('migrates to V5 format with correct filter expression structure, aggregations, and groupBy', () => {
			const payload = getEndPointDetailsQueryPayload(
				mockDomainName,
				mockStartTime,
				mockEndTime,
				emptyFilters,
			);

			// Third payload is the endpoint dropdown query (index 2)
			const dropdownQuery = payload[2];
			const queryA = dropdownQuery.query.builder.queryData[0];

			// CRITICAL V5 MIGRATION: filter.expression (not filters.items)
			expect(queryA.filter).toBeDefined();
			expect(queryA.filter?.expression).toBeDefined();
			expect(typeof queryA.filter?.expression).toBe('string');
			expect(queryA).not.toHaveProperty('filters');

			// Base filter 1: Domain (net.peer.name OR server.address)
			expect(queryA.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}')`,
			);

			// Base filter 2: Kind
			expect(queryA.filter?.expression).toContain("kind_string = 'Client'");

			// Base filter 3: Existence check
			expect(queryA.filter?.expression).toContain(
				'(http.url EXISTS OR url.full EXISTS)',
			);

			// V5 Aggregation format: aggregations array (not aggregateAttribute)
			expect(queryA.aggregations).toBeDefined();
			expect(Array.isArray(queryA.aggregations)).toBe(true);
			expect(queryA.aggregations?.[0]).toEqual({
				expression: 'count()',
			});
			expect(queryA).not.toHaveProperty('aggregateAttribute');

			// GroupBy: Both http.url and url.full
			expect(queryA.groupBy).toHaveLength(2);
			expect(queryA.groupBy).toContainEqual({
				key: 'http.url',
				dataType: 'string',
				type: 'attribute',
			});
			expect(queryA.groupBy).toContainEqual({
				key: 'url.full',
				dataType: 'string',
				type: 'attribute',
			});
		});
	});

	describe('2. Custom Filters Integration', () => {
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

			const dropdownQuery = payload[2];
			const expression =
				dropdownQuery.query.builder.queryData[0].filter?.expression;

			// Exact filter expression with custom filters merged
			expect(expression).toBe(
				"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com') AND kind_string = 'Client' AND (http.url EXISTS OR url.full EXISTS) service.name = 'user-service' AND deployment.environment = 'production'",
			);
		});
	});

	describe('3. HTTP URL Filter Special Handling', () => {
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

			const dropdownQuery = payload[2];
			const expression =
				dropdownQuery.query.builder.queryData[0].filter?.expression;

			// CRITICAL: Exact filter expression with http.url converted to OR logic
			expect(expression).toBe(
				"(net.peer.name = 'api.example.com' OR server.address = 'api.example.com') AND kind_string = 'Client' AND (http.url EXISTS OR url.full EXISTS) service.name = 'user-service' AND (http.url = '/api/users' OR url.full = '/api/users')",
			);
		});
	});
});
