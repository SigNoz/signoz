/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */

import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	getQueryData,
	getViewQuery,
	isValidQueryName,
} from '../drilldownUtils';
import { METRIC_TO_LOGS_TRACES_MAPPINGS } from '../metricsCorrelationUtils';

// Mock the transformMetricsToLogsTraces function since it's not exported
// We'll test it indirectly through getViewQuery
describe('drilldownUtils', () => {
	describe('getQueryData', () => {
		it('should return the first query that matches the queryName', () => {
			const mockQuery: Query = {
				id: 'test-query',
				queryType: 'builder' as any,
				builder: {
					queryData: [
						{
							queryName: 'query1',
							dataSource: 'metrics' as any,
							groupBy: [],
							expression: '',
							disabled: false,
							functions: [],
							legend: '',
							having: [],
							limit: null,
							stepInterval: undefined,
							orderBy: [],
						},
						{
							queryName: 'query2',
							dataSource: 'logs' as any,
							groupBy: [],
							expression: '',
							disabled: false,
							functions: [],
							legend: '',
							having: [],
							limit: null,
							stepInterval: undefined,
							orderBy: [],
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				promql: [],
				clickhouse_sql: [],
			};

			const result = getQueryData(mockQuery, 'query2');
			expect(result?.queryName).toBe('query2');
			expect(result?.dataSource).toBe('logs');
		});

		it('should return undefined if no query matches the queryName', () => {
			const mockQuery: Query = {
				id: 'test-query',
				queryType: 'builder' as any,
				builder: {
					queryData: [
						{
							queryName: 'query1',
							dataSource: 'metrics' as any,
							groupBy: [],
							expression: '',
							disabled: false,
							functions: [],
							legend: '',
							having: [],
							limit: null,
							stepInterval: undefined,
							orderBy: [],
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				promql: [],
				clickhouse_sql: [],
			};

			const result = getQueryData(mockQuery, 'nonexistent');
			expect(result).toBeUndefined();
		});
	});

	describe('isValidQueryName', () => {
		it('should return false for empty queryName', () => {
			expect(isValidQueryName('')).toBe(false);
			expect(isValidQueryName('   ')).toBe(false);
		});

		it('should return false for queryName starting with F', () => {
			expect(isValidQueryName('F1')).toBe(false);
			expect(isValidQueryName('Formula1')).toBe(false);
		});

		it('should return true for valid queryName', () => {
			expect(isValidQueryName('query1')).toBe(true);
			expect(isValidQueryName('metrics_query')).toBe(true);
		});
	});

	describe('getViewQuery with metric-to-logs/traces transformations', () => {
		// Mock data for testing transformations
		const mockMetricsQuery: Query = {
			id: 'metrics-query',
			queryType: 'builder' as any,
			builder: {
				queryData: [
					{
						queryName: 'metrics_query',
						dataSource: 'metrics' as any,
						aggregations: [{ metricName: 'signoz_test_metric' }] as any,
						groupBy: [],
						expression: '',
						disabled: false,
						functions: [],
						legend: '',
						having: [],
						limit: null,
						stepInterval: undefined,
						orderBy: [],
						filter: {
							expression:
								'operation = "GET" AND span.kind = SPAN_KIND_SERVER AND status.code = STATUS_CODE_OK',
						},
					},
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
			promql: [],
			clickhouse_sql: [],
		};

		const mockFilters = [
			{ filterKey: 'service', filterValue: 'test-service', operator: '=' },
		];

		it('should transform metrics query when drilling down to logs', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<
				string,
				{ newAttribute: string; valueMappings: Record<string, string> }
			>;
			const spanKindMapping = mappingsByAttr['span.kind'];
			const spanKindKey = spanKindMapping.newAttribute;
			const spanKindServer = spanKindMapping.valueMappings.SPAN_KIND_SERVER;

			const result = getViewQuery(
				mockMetricsQuery,
				mockFilters,
				'view_logs',
				'metrics_query',
			);

			expect(result).not.toBeNull();
			expect(result?.builder.queryData).toHaveLength(1);

			// Check if the filter expression was transformed
			const filterExpression = result?.builder.queryData[0]?.filter?.expression;
			expect(filterExpression).toBeDefined();

			// Verify transformations were applied
			if (filterExpression) {
				// Rule 2: operation → name
				expect(filterExpression).toContain(`name = 'GET'`);
				expect(filterExpression).not.toContain(`operation = 'GET'`);

				// Rule 3: span.kind → kind
				expect(filterExpression).toContain(`${spanKindKey} = '${spanKindServer}'`);
				expect(filterExpression).not.toContain(`span.kind = SPAN_KIND_SERVER`);

				// Rule 4: status.code → status_code_string with value mapping
				expect(filterExpression).toContain(`status_code_string = 'Ok'`);
				expect(filterExpression).not.toContain(`status.code = STATUS_CODE_OK`);
			}
		});

		it('should transform metrics query when drilling down to traces', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<
				string,
				{ newAttribute: string; valueMappings: Record<string, string> }
			>;
			const spanKindMapping = mappingsByAttr['span.kind'];
			const spanKindKey = spanKindMapping.newAttribute;
			const spanKindServer = spanKindMapping.valueMappings.SPAN_KIND_SERVER;

			const result = getViewQuery(
				mockMetricsQuery,
				mockFilters,
				'view_traces',
				'metrics_query',
			);

			expect(result).not.toBeNull();
			expect(result?.builder.queryData).toHaveLength(1);

			// Check if the filter expression was transformed
			const filterExpression = result?.builder.queryData[0]?.filter?.expression;
			expect(filterExpression).toBeDefined();

			// Verify transformations were applied
			if (filterExpression) {
				// Rule 2: operation → name
				expect(filterExpression).toContain(`name = 'GET'`);
				expect(filterExpression).not.toContain(`operation = 'GET'`);

				// Rule 3: span.kind → kind
				expect(filterExpression).toContain(`${spanKindKey} = '${spanKindServer}'`);
				expect(filterExpression).not.toContain(`span.kind = SPAN_KIND_SERVER`);

				// Rule 4: status.code → status_code_string with value mapping
				expect(filterExpression).toContain(`status_code_string = 'Ok'`);
				expect(filterExpression).not.toContain(`status.code = STATUS_CODE_OK`);
			}
		});

		it('should handle complex filter expressions with multiple transformations', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<
				string,
				{ newAttribute: string; valueMappings: Record<string, string> }
			>;
			const spanKindMapping = mappingsByAttr['span.kind'];
			const spanKindKey = spanKindMapping.newAttribute;
			const spanKindClient = spanKindMapping.valueMappings.SPAN_KIND_CLIENT;

			const complexQuery: Query = {
				...mockMetricsQuery,
				builder: {
					...mockMetricsQuery.builder,
					queryData: [
						{
							...mockMetricsQuery.builder.queryData[0],
							filter: {
								expression:
									'operation = "POST" AND span.kind = SPAN_KIND_CLIENT AND status.code = STATUS_CODE_ERROR AND http.status_code = 500',
							},
						},
					],
				},
			};

			const result = getViewQuery(
				complexQuery,
				mockFilters,
				'view_logs',
				'metrics_query',
			);

			expect(result).not.toBeNull();
			const filterExpression = result?.builder.queryData[0]?.filter?.expression;

			if (filterExpression) {
				// All transformations should be applied
				expect(filterExpression).toContain(`name = 'POST'`);
				expect(filterExpression).toContain(`${spanKindKey} = '${spanKindClient}'`);
				expect(filterExpression).toContain(`status_code_string = 'Error'`);
				expect(filterExpression).toContain(`http.status_code = 500`);
			}
		});

		it('should handle filter expressions with no transformations needed', () => {
			const simpleQuery: Query = {
				...mockMetricsQuery,
				builder: {
					...mockMetricsQuery.builder,
					queryData: [
						{
							...mockMetricsQuery.builder.queryData[0],
							filter: {
								expression: 'service = "test-service" AND method = "GET"',
							},
						},
					],
				},
			};

			const result = getViewQuery(
				simpleQuery,
				mockFilters,
				'view_logs',
				'metrics_query',
			);

			expect(result).not.toBeNull();
			const filterExpression = result?.builder.queryData[0]?.filter?.expression;

			if (filterExpression) {
				// No transformations should be applied
				expect(filterExpression).toContain('service = "test-service"');
				expect(filterExpression).toContain('method = "GET"');
			}
		});

		it('should handle all status code value mappings correctly', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<string, { valueMappings: Record<string, string> }>;
			const statusMap = mappingsByAttr['status.code'].valueMappings;

			Object.entries(statusMap).forEach(([input, expected]) => {
				const testQuery: Query = {
					...mockMetricsQuery,
					builder: {
						...mockMetricsQuery.builder,
						queryData: [
							{
								...mockMetricsQuery.builder.queryData[0],
								filter: {
									expression: `status.code = ${input}`,
								},
							},
						],
					},
				};

				const result = getViewQuery(
					testQuery,
					mockFilters,
					'view_logs',
					'metrics_query',
				);
				const filterExpression = result?.builder.queryData[0]?.filter?.expression;

				expect(filterExpression).toContain(`status_code_string = '${expected}'`);
				expect(filterExpression).not.toContain(`status.code = ${input}`);
			});
		});

		it('should handle quoted status code values (browser scenario)', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<string, { valueMappings: Record<string, string> }>;
			const statusMap = mappingsByAttr['status.code'].valueMappings;

			Object.entries(statusMap).forEach(([input, expected]) => {
				const testQuery: Query = {
					...mockMetricsQuery,
					builder: {
						...mockMetricsQuery.builder,
						queryData: [
							{
								...mockMetricsQuery.builder.queryData[0],
								filter: {
									expression: `status.code = "${input}"`,
								},
							},
						],
					},
				};

				const result = getViewQuery(
					testQuery,
					mockFilters,
					'view_logs',
					'metrics_query',
				);
				const filterExpression = result?.builder.queryData[0]?.filter?.expression;

				// Should preserve the quoting from the original expression
				expect(filterExpression).toContain(`status_code_string = '${expected}'`);
				expect(filterExpression).not.toContain(`status.code = "${input}"`);
			});
		});

		it('should preserve non-metric attributes during transformation', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<
				string,
				{ newAttribute: string; valueMappings: Record<string, string> }
			>;
			const spanKindMapping = mappingsByAttr['span.kind'];
			const spanKindKey = spanKindMapping.newAttribute;
			const spanKindServer = spanKindMapping.valueMappings.SPAN_KIND_SERVER;

			const mixedQuery: Query = {
				...mockMetricsQuery,
				builder: {
					...mockMetricsQuery.builder,
					queryData: [
						{
							...mockMetricsQuery.builder.queryData[0],
							filter: {
								expression:
									'operation = "GET" AND service = "test-service" AND span.kind = SPAN_KIND_SERVER AND environment = "prod"',
							},
						},
					],
				},
			};

			const result = getViewQuery(
				mixedQuery,
				mockFilters,
				'view_logs',
				'metrics_query',
			);
			const filterExpression = result?.builder.queryData[0]?.filter?.expression;

			if (filterExpression) {
				// Transformed attributes
				expect(filterExpression).toContain(`name = 'GET'`);
				expect(filterExpression).toContain(`${spanKindKey} = '${spanKindServer}'`);

				// Preserved non-metric attributes
				expect(filterExpression).toContain('service = "test-service"');
				expect(filterExpression).toContain('environment = "prod"');
			}
		});

		it('should handle all span.kind value mappings correctly', () => {
			const mappingsByAttr = Object.fromEntries(
				METRIC_TO_LOGS_TRACES_MAPPINGS.map((m) => [m.attribute, m]),
			) as Record<
				string,
				{ newAttribute: string; valueMappings: Record<string, string> }
			>;
			const spanKindMapping = mappingsByAttr['span.kind'];
			const spanKindKey = spanKindMapping.newAttribute;
			const spanKindMap = spanKindMapping.valueMappings;

			Object.entries(spanKindMap).forEach(([input, expected]) => {
				const testQuery: Query = {
					...mockMetricsQuery,
					builder: {
						...mockMetricsQuery.builder,
						queryData: [
							{
								...mockMetricsQuery.builder.queryData[0],
								filter: {
									expression: `span.kind = ${input}`,
								},
							},
						],
					},
				};

				const result = getViewQuery(
					testQuery,
					mockFilters,
					'view_logs',
					'metrics_query',
				);
				const filterExpression = result?.builder.queryData[0]?.filter?.expression;

				expect(filterExpression).toContain(`${spanKindKey} = '${expected}'`);
				expect(filterExpression).not.toContain(`span.kind = ${input}`);
			});
		});

		it('should not transform when the source query is not metrics (logs/traces sources)', () => {
			(['logs', 'traces'] as const).forEach((source) => {
				const nonMetricsQuery: Query = {
					...mockMetricsQuery,
					builder: {
						...mockMetricsQuery.builder,
						queryData: [
							{
								...mockMetricsQuery.builder.queryData[0],
								dataSource: source as any,
								filter: {
									expression:
										'operation = "GET" AND span.kind = SPAN_KIND_SERVER AND status.code = STATUS_CODE_OK',
								},
							},
						],
					},
				};

				const result = getViewQuery(
					nonMetricsQuery,
					mockFilters,
					source === 'logs' ? 'view_logs' : 'view_traces',
					'metrics_query',
				);

				const expr = result?.builder.queryData[0]?.filter?.expression || '';
				// Should remain unchanged (no metric-to-logs/traces transformations)
				expect(expr).toContain('operation = "GET"');
				expect(expr).toContain('span.kind = SPAN_KIND_SERVER');
				expect(expr).toContain('status.code = STATUS_CODE_OK');

				// And should not contain transformed counterparts
				expect(expr).not.toContain(`name = 'GET'`);
				expect(expr).not.toContain(`kind = '2'`);
				expect(expr).not.toContain(`status_code_string = 'Ok'`);
			});
		});
	});
});
