import { Query } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Frozen canonical baselines the V-raw/TV adapters diff against. Encode stores
 * only the diff from the chosen baseline; decode replays it onto a clone. These
 * MUST stay byte-stable forever — changing them silently invalidates every URL
 * already emitted against the old baseline. To evolve the schema, add NEW
 * tagged adapters (V2~) with their own baselines rather than editing these.
 *
 * `id`/`unit` are empty so a real query's values round-trip as ordinary diff
 * entries (nothing is stripped before diffing).
 */

/**
 * Baseline for logs/traces queries — uses expression-style aggregations.
 */
export const LOGS_BASELINE_V1 = {
	queryType: 'builder',
	builder: {
		queryData: [
			{
				dataSource: 'logs',
				queryName: 'A',
				aggregateOperator: null,
				aggregateAttribute: {
					id: '----',
					key: '',
					dataType: '',
					type: '',
				},
				timeAggregation: 'rate',
				spaceAggregation: 'sum',
				filter: { expression: '' },
				aggregations: [{ expression: 'count() ' }],
				functions: [],
				filters: { items: [], op: 'AND' },
				expression: 'A',
				disabled: false,
				stepInterval: null,
				having: [],
				limit: null,
				orderBy: [],
				groupBy: [],
				legend: '',
				reduceTo: 'avg',
				source: null,
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	id: '',
	unit: '',
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any as Query;
