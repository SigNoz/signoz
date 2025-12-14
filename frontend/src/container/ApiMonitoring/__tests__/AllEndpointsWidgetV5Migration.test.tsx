/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
/**
 * V5 Migration Tests for All Endpoints Widget (Endpoint Overview)
 *
 * These tests validate the migration from V4 to V5 format for getAllEndpointsWidgetData:
 * - Filter format change: filters.items[] → filter.expression
 * - Aggregation format: aggregateAttribute → aggregations[] array
 * - Domain filter: (net.peer.name OR server.address)
 * - Kind filter: kind_string = 'Client'
 * - Four queries: A (count), B (p99 latency), C (max timestamp), D (error count - disabled)
 * - GroupBy: Both http.url AND url.full with type 'attribute'
 */
import { getAllEndpointsWidgetData } from 'container/ApiMonitoring/utils';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

describe('AllEndpointsWidget - V5 Migration Validation', () => {
	const mockDomainName = 'api.example.com';
	const emptyFilters: IBuilderQuery['filters'] = {
		items: [],
		op: 'AND',
	};
	const emptyGroupBy: BaseAutocompleteData[] = [];

	describe('1. V5 Format Migration - All Four Queries', () => {
		it('all queries use filter.expression format (not filters.items)', () => {
			const widget = getAllEndpointsWidgetData(
				emptyGroupBy,
				mockDomainName,
				emptyFilters,
			);

			const { queryData } = widget.query.builder;

			// All 4 queries must use V5 filter.expression format
			queryData.forEach((query) => {
				expect(query.filter).toBeDefined();
				expect(query.filter?.expression).toBeDefined();
				expect(typeof query.filter?.expression).toBe('string');
				// OLD V4 format should NOT exist
				expect(query).not.toHaveProperty('filters');
			});

			// Verify we have exactly 4 queries
			expect(queryData).toHaveLength(4);
		});

		it('all queries use aggregations array format (not aggregateAttribute)', () => {
			const widget = getAllEndpointsWidgetData(
				emptyGroupBy,
				mockDomainName,
				emptyFilters,
			);

			const [queryA, queryB, queryC, queryD] = widget.query.builder.queryData;

			// Query A: count()
			expect(queryA.aggregations).toBeDefined();
			expect(Array.isArray(queryA.aggregations)).toBe(true);
			expect(queryA.aggregations).toEqual([{ expression: 'count()' }]);
			expect(queryA).not.toHaveProperty('aggregateAttribute');

			// Query B: p99(duration_nano)
			expect(queryB.aggregations).toBeDefined();
			expect(Array.isArray(queryB.aggregations)).toBe(true);
			expect(queryB.aggregations).toEqual([{ expression: 'p99(duration_nano)' }]);
			expect(queryB).not.toHaveProperty('aggregateAttribute');

			// Query C: max(timestamp)
			expect(queryC.aggregations).toBeDefined();
			expect(Array.isArray(queryC.aggregations)).toBe(true);
			expect(queryC.aggregations).toEqual([{ expression: 'max(timestamp)' }]);
			expect(queryC).not.toHaveProperty('aggregateAttribute');

			// Query D: count() (disabled, for errors)
			expect(queryD.aggregations).toBeDefined();
			expect(Array.isArray(queryD.aggregations)).toBe(true);
			expect(queryD.aggregations).toEqual([{ expression: 'count()' }]);
			expect(queryD).not.toHaveProperty('aggregateAttribute');
		});

		it('all queries have correct base filter expressions', () => {
			const widget = getAllEndpointsWidgetData(
				emptyGroupBy,
				mockDomainName,
				emptyFilters,
			);

			const [queryA, queryB, queryC, queryD] = widget.query.builder.queryData;

			const baseExpression = `(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}') AND kind_string = 'Client'`;

			// Queries A, B, C have identical base filter
			expect(queryA.filter?.expression).toBe(
				`${baseExpression} AND (http.url EXISTS OR url.full EXISTS)`,
			);
			expect(queryB.filter?.expression).toBe(
				`${baseExpression} AND (http.url EXISTS OR url.full EXISTS)`,
			);
			expect(queryC.filter?.expression).toBe(
				`${baseExpression} AND (http.url EXISTS OR url.full EXISTS)`,
			);

			// Query D has additional has_error filter
			expect(queryD.filter?.expression).toBe(
				`${baseExpression} AND has_error = true AND (http.url EXISTS OR url.full EXISTS)`,
			);
		});
	});

	describe('2. GroupBy Structure', () => {
		it('default groupBy includes both http.url and url.full with type attribute', () => {
			const widget = getAllEndpointsWidgetData(
				emptyGroupBy,
				mockDomainName,
				emptyFilters,
			);

			const { queryData } = widget.query.builder;

			// All queries should have the same default groupBy
			queryData.forEach((query) => {
				expect(query.groupBy).toHaveLength(2);

				// http.url
				expect(query.groupBy).toContainEqual({
					dataType: DataTypes.String,
					isColumn: false,
					isJSON: false,
					key: 'http.url',
					type: 'attribute',
				});

				// url.full
				expect(query.groupBy).toContainEqual({
					dataType: DataTypes.String,
					isColumn: false,
					isJSON: false,
					key: 'url.full',
					type: 'attribute',
				});
			});
		});

		it('custom groupBy is appended after defaults', () => {
			const customGroupBy: BaseAutocompleteData[] = [
				{
					dataType: DataTypes.String,
					key: 'service.name',
					type: 'resource',
				},
				{
					dataType: DataTypes.String,
					key: 'deployment.environment',
					type: 'resource',
				},
			];

			const widget = getAllEndpointsWidgetData(
				customGroupBy,
				mockDomainName,
				emptyFilters,
			);

			const { queryData } = widget.query.builder;

			// All queries should have defaults + custom groupBy
			queryData.forEach((query) => {
				expect(query.groupBy).toHaveLength(4); // 2 defaults + 2 custom

				// First two should be defaults (http.url, url.full)
				expect(query.groupBy[0].key).toBe('http.url');
				expect(query.groupBy[1].key).toBe('url.full');

				// Last two should be custom (matching subset of properties)
				expect(query.groupBy[2]).toMatchObject({
					dataType: DataTypes.String,
					key: 'service.name',
					type: 'resource',
				});
				expect(query.groupBy[3]).toMatchObject({
					dataType: DataTypes.String,
					key: 'deployment.environment',
					type: 'resource',
				});
			});
		});
	});

	describe('3. Query-Specific Validations', () => {
		it('query D has has_error filter and is disabled', () => {
			const widget = getAllEndpointsWidgetData(
				emptyGroupBy,
				mockDomainName,
				emptyFilters,
			);

			const [queryA, queryB, queryC, queryD] = widget.query.builder.queryData;

			// Query D should be disabled
			expect(queryD.disabled).toBe(true);

			// Queries A, B, C should NOT be disabled
			expect(queryA.disabled).toBe(false);
			expect(queryB.disabled).toBe(false);
			expect(queryC.disabled).toBe(false);

			// Query D should have has_error in filter
			expect(queryD.filter?.expression).toContain('has_error = true');

			// Queries A, B, C should NOT have has_error
			expect(queryA.filter?.expression).not.toContain('has_error');
			expect(queryB.filter?.expression).not.toContain('has_error');
			expect(queryC.filter?.expression).not.toContain('has_error');
		});
	});
});
