import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import {
	buildVariableReferencePattern,
	extractQueryTextStrings,
	getVariableReferencesInQuery,
	textContainsVariableReference,
} from './variableReference';

describe('buildVariableReferencePattern', () => {
	const varName = 'deployment_environment';

	it.each([
		['{{.deployment_environment}}', '{{.var}} syntax'],
		['{{ .deployment_environment }}', '{{.var}} with spaces'],
		['{{deployment_environment}}', '{{var}} syntax'],
		['{{ deployment_environment }}', '{{var}} with spaces'],
		['$deployment_environment', '$var syntax'],
		['[[deployment_environment]]', '[[var]] syntax'],
		['[[ deployment_environment ]]', '[[var]] with spaces'],
	])('matches %s (%s)', (text) => {
		expect(buildVariableReferencePattern(varName).test(text)).toBe(true);
	});

	it('does not match partial variable names', () => {
		const pattern = buildVariableReferencePattern('env');
		// $env should match at word boundary, but $environment should not match $env
		expect(pattern.test('$environment')).toBe(false);
	});

	it('matches $var at word boundary within larger text', () => {
		const pattern = buildVariableReferencePattern('env');
		expect(pattern.test('SELECT * WHERE x = $env')).toBe(true);
		expect(pattern.test('$env AND y = 1')).toBe(true);
	});
});

describe('textContainsVariableReference', () => {
	describe('guard clauses', () => {
		it('returns false for empty text', () => {
			expect(textContainsVariableReference('', 'var')).toBe(false);
		});

		it('returns false for empty variable name', () => {
			expect(textContainsVariableReference('some text', '')).toBe(false);
		});
	});

	describe('all syntax formats', () => {
		const varName = 'service_name';

		it('detects {{.var}} format', () => {
			const query = "SELECT * FROM table WHERE service = '{{.service_name}}'";
			expect(textContainsVariableReference(query, varName)).toBe(true);
		});

		it('detects {{var}} format', () => {
			const query = "SELECT * FROM table WHERE service = '{{service_name}}'";
			expect(textContainsVariableReference(query, varName)).toBe(true);
		});

		it('detects $var format', () => {
			const query = "SELECT * FROM table WHERE service = '$service_name'";
			expect(textContainsVariableReference(query, varName)).toBe(true);
		});

		it('detects [[var]] format', () => {
			const query = "SELECT * FROM table WHERE service = '[[service_name]]'";
			expect(textContainsVariableReference(query, varName)).toBe(true);
		});
	});

	describe('embedded in larger text', () => {
		it('finds variable in a multi-line query', () => {
			const query = `SELECT JSONExtractString(labels, 'k8s_node_name') AS k8s_node_name
FROM signoz_metrics.distributed_time_series_v4_1day
WHERE metric_name = 'k8s_node_cpu_time' AND JSONExtractString(labels, 'k8s_cluster_name') = {{.k8s_cluster_name}}
GROUP BY k8s_node_name`;
			expect(textContainsVariableReference(query, 'k8s_cluster_name')).toBe(true);
			expect(textContainsVariableReference(query, 'k8s_node_name')).toBe(false); // plain text, not a variable reference
		});
	});

	describe('no false positives', () => {
		it('does not match substring of a longer variable name', () => {
			expect(
				textContainsVariableReference('$service_name_v2', 'service_name'),
			).toBe(false);
		});

		it('does not match plain text that happens to contain the name', () => {
			expect(
				textContainsVariableReference(
					'the service_name column is important',
					'service_name',
				),
			).toBe(false);
		});
	});
});

// ---- Query text extraction & variable reference detection ----

const baseQuery: Query = {
	id: 'test-query',
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
	clickhouse_sql: [],
};

describe('extractQueryTextStrings', () => {
	it('returns empty array for query builder with no data', () => {
		expect(extractQueryTextStrings(baseQuery)).toEqual([]);
	});

	it('extracts string values from query builder filter items', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: {
							items: [
								{ id: '1', op: '=', value: ['$service_name', 'hardcoded'] },
								{ id: '2', op: '=', value: '$env' },
							],
							op: 'AND',
						},
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		const texts = extractQueryTextStrings(query);
		expect(texts).toEqual(['$service_name', 'hardcoded', '$env']);
	});

	it('extracts filter expression from query builder', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: { items: [], op: 'AND' },
						filter: { expression: 'env = $deployment_environment' },
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		const texts = extractQueryTextStrings(query);
		expect(texts).toEqual(['env = $deployment_environment']);
	});

	it('skips non-string filter values', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: {
							items: [{ id: '1', op: '=', value: [42, true] }],
							op: 'AND',
						},
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		expect(extractQueryTextStrings(query)).toEqual([]);
	});

	it('extracts promql query strings', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.PROM,
			promql: [
				{ name: 'A', query: 'up{env="$env"}', legend: '', disabled: false },
				{ name: 'B', query: 'cpu{ns="$namespace"}', legend: '', disabled: false },
			],
		};

		expect(extractQueryTextStrings(query)).toEqual([
			'up{env="$env"}',
			'cpu{ns="$namespace"}',
		]);
	});

	it('extracts clickhouse sql query strings', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.CLICKHOUSE,
			clickhouse_sql: [
				{
					name: 'A',
					query: 'SELECT * WHERE env = {{.env}}',
					legend: '',
					disabled: false,
				},
			],
		};

		expect(extractQueryTextStrings(query)).toEqual([
			'SELECT * WHERE env = {{.env}}',
		]);
	});

	it('accumulates texts across multiple queryData entries', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: {
							items: [{ id: '1', op: '=', value: '$env' }],
							op: 'AND',
						},
					} as unknown) as IBuilderQuery,
					({
						filters: {
							items: [{ id: '2', op: '=', value: ['$service_name'] }],
							op: 'AND',
						},
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		expect(extractQueryTextStrings(query)).toEqual(['$env', '$service_name']);
	});

	it('collects both filter items and filter expression from the same queryData', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: {
							items: [{ id: '1', op: '=', value: '$service_name' }],
							op: 'AND',
						},
						filter: { expression: 'env = $deployment_environment' },
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		expect(extractQueryTextStrings(query)).toEqual([
			'$service_name',
			'env = $deployment_environment',
		]);
	});

	it('skips promql entries with empty query strings', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.PROM,
			promql: [
				{ name: 'A', query: '', legend: '', disabled: false },
				{ name: 'B', query: 'up{env="$env"}', legend: '', disabled: false },
			],
		};

		expect(extractQueryTextStrings(query)).toEqual(['up{env="$env"}']);
	});

	it('skips clickhouse entries with empty query strings', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.CLICKHOUSE,
			clickhouse_sql: [
				{ name: 'A', query: '', legend: '', disabled: false },
				{
					name: 'B',
					query: 'SELECT * WHERE x = {{.env}}',
					legend: '',
					disabled: false,
				},
			],
		};

		expect(extractQueryTextStrings(query)).toEqual([
			'SELECT * WHERE x = {{.env}}',
		]);
	});

	it('returns empty array for unknown query type', () => {
		const query = {
			...baseQuery,
			queryType: ('unknown' as unknown) as EQueryType,
		};
		expect(extractQueryTextStrings(query)).toEqual([]);
	});
});

describe('getVariableReferencesInQuery', () => {
	const variableNames = [
		'deployment_environment',
		'service_name',
		'endpoint',
		'unused_var',
	];

	it('returns empty array when query has no text', () => {
		expect(getVariableReferencesInQuery(baseQuery, variableNames)).toEqual([]);
	});

	it('detects variables referenced in query builder filters', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: {
							items: [
								{ id: '1', op: '=', value: '$service_name' },
								{ id: '2', op: 'IN', value: ['$deployment_environment'] },
							],
							op: 'AND',
						},
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		const result = getVariableReferencesInQuery(query, variableNames);
		expect(result).toEqual(['deployment_environment', 'service_name']);
	});

	it('detects variables in promql queries', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.PROM,
			promql: [
				{
					name: 'A',
					query:
						'http_requests{env="{{.deployment_environment}}", endpoint="$endpoint"}',
					legend: '',
					disabled: false,
				},
			],
		};

		const result = getVariableReferencesInQuery(query, variableNames);
		expect(result).toEqual(['deployment_environment', 'endpoint']);
	});

	it('detects variables in clickhouse sql queries', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.CLICKHOUSE,
			clickhouse_sql: [
				{
					name: 'A',
					query: 'SELECT * FROM table WHERE service = [[service_name]]',
					legend: '',
					disabled: false,
				},
			],
		};

		const result = getVariableReferencesInQuery(query, variableNames);
		expect(result).toEqual(['service_name']);
	});

	it('detects variables spread across multiple queryData entries', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					({
						filters: {
							items: [{ id: '1', op: '=', value: '$service_name' }],
							op: 'AND',
						},
					} as unknown) as IBuilderQuery,
					({
						filter: { expression: 'env = $deployment_environment' },
					} as unknown) as IBuilderQuery,
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		const result = getVariableReferencesInQuery(query, variableNames);
		expect(result).toEqual(['deployment_environment', 'service_name']);
	});

	it('returns empty array when no variables are referenced', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.PROM,
			promql: [
				{
					name: 'A',
					query: 'up{job="api"}',
					legend: '',
					disabled: false,
				},
			],
		};

		expect(getVariableReferencesInQuery(query, variableNames)).toEqual([]);
	});

	it('returns empty array when variableNames list is empty', () => {
		const query: Query = {
			...baseQuery,
			queryType: EQueryType.PROM,
			promql: [
				{
					name: 'A',
					query: 'up{env="$deployment_environment"}',
					legend: '',
					disabled: false,
				},
			],
		};

		expect(getVariableReferencesInQuery(query, [])).toEqual([]);
	});
});
