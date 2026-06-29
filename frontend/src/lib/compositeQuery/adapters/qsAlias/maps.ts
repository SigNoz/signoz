/**
 * Path and field alias maps for qsAlias encoder.
 *
 * PREFIX SUBSTITUTION:
 *   builder.queryData.0.field → query0.field
 *   builder.queryFormulas.0.field → formula0.field
 *   builder.queryTraceOperator.0.field → traceOp0.field
 *   promql.0.field → promql0.field
 *   clickhouse_sql.0.field → chsql0.field
 *
 * FIELD ALIASES (long → short):
 *   aggregateAttribute → aggAttr
 *   timeAggregation → timeAgg
 *   spaceAggregation → spaceAgg
 */

interface PrefixPattern {
	match: string[];
	prefix: string;
}

export const PREFIX_PATTERNS: PrefixPattern[] = [
	{ match: ['builder', 'queryData'], prefix: 'query' },
	{ match: ['builder', 'queryFormulas'], prefix: 'formula' },
	{ match: ['builder', 'queryTraceOperator'], prefix: 'traceOp' },
	{ match: ['promql'], prefix: 'promql' },
	{ match: ['clickhouse_sql'], prefix: 'chsql' },
];

export const PREFIX_REVERSE: Record<string, string[]> = {
	query: ['builder', 'queryData'],
	formula: ['builder', 'queryFormulas'],
	traceOp: ['builder', 'queryTraceOperator'],
	promql: ['promql'],
	chsql: ['clickhouse_sql'],
};

export const FIELD_ALIASES: Record<string, string> = {
	aggregateAttribute: 'aggAttr',
	aggregateOperator: 'aggOp',
	timeAggregation: 'timeAgg',
	spaceAggregation: 'spaceAgg',
	stepInterval: 'stepIn',
	dataSource: 'ds',
	queryName: 'qn',
	dataType: 'dt',
	isColumn: 'ic',
	isJSON: 'ij',
	metricName: 'mn',
	temporality: 'tp',
	queryType: 'qt',
};

export const FIELD_REVERSE: Record<string, string> = Object.fromEntries(
	Object.entries(FIELD_ALIASES).map(([k, v]) => [v, k]),
);

/**
 * Keys that belong to the qsAlias format. Anything else is a foreign param.
 * Derived from PREFIX_PATTERNS + known top-level Query keys (and their aliases).
 */
const OWNED_PREFIXES = PREFIX_PATTERNS.map((p) => p.prefix).join('|');
const OWNED_TOP_LEVEL = ['id', 'queryType', 'qt', 'unit'];
const OWNED_KEY_PATTERN = new RegExp(
	`^(?:_t|-?(?:${OWNED_PREFIXES})\\d+|${OWNED_TOP_LEVEL.join('|')})(?:\\.|$)`,
);

export function isOwnedKey(key: string): boolean {
	return OWNED_KEY_PATTERN.test(key);
}
