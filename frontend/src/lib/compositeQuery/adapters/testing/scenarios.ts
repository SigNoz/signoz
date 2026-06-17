import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export interface RoundTripScenario {
	name: string;
	query: Query;
}

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;

const makePromqlQuery = (): Query => {
	const query = clone(initialQueriesMap.metrics);
	query.queryType = EQueryType.PROM;
	query.promql[0].query = 'rate(http_requests_total[5m])';
	return query;
};

const makeClickhouseQuery = (): Query => {
	const query = clone(initialQueriesMap.metrics);
	query.queryType = EQueryType.CLICKHOUSE;
	query.clickhouse_sql[0].query = 'SELECT count() FROM signoz_logs';
	return query;
};

const makeModifiedBuilderQuery = (): Query => {
	const query = clone(initialQueriesMap.logs);
	const qd = query.builder.queryData[0];
	qd.aggregateOperator = 'p95';
	qd.disabled = true;
	qd.stepInterval = 60;
	qd.legend = 'error rate';
	qd.filter = { expression: "severity_text = 'ERROR'" };
	qd.filters = {
		op: 'AND',
		items: [
			{
				key: {
					key: 'severity_text',
					dataType: 'string',
					type: 'tag',
					isColumn: false,
					isJSON: false,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} as any,
				id: 'item-1',
				op: '=',
				value: 'ERROR',
			},
		],
	};
	qd.orderBy = [{ columnName: 'timestamp', order: 'desc' }];
	return query;
};

const makeQueryWithCustomId = (): Query => ({
	...initialQueriesMap.metrics,
	id: 'test-query-uuid-123',
});

const makeQueryWithEnumLikeLegend = (): Query => {
	const query = clone(initialQueriesMap.metrics);
	query.builder.queryData[0].legend = 'sum';
	query.id = 'my-query-id';
	return query;
};

const makeQueryWithWireDelimiters = (): Query => {
	const query = clone(initialQueriesMap.logs);
	query.builder.queryData[0].legend = '_a*b_*c';
	query.builder.queryData[0].filter = { expression: '!weird = "x_y*z"' };
	return query;
};

export const roundTripScenarios: RoundTripScenario[] = [
	{ name: 'metrics baseline', query: initialQueriesMap.metrics },
	{ name: 'logs baseline', query: initialQueriesMap.logs },
	{ name: 'traces baseline', query: initialQueriesMap.traces },
	{ name: 'promql query', query: makePromqlQuery() },
	{ name: 'clickhouse query', query: makeClickhouseQuery() },
	{ name: 'modified builder query', query: makeModifiedBuilderQuery() },
	{ name: 'custom id', query: makeQueryWithCustomId() },
	{ name: 'enum-like legend preserved', query: makeQueryWithEnumLikeLegend() },
	{ name: 'wire delimiters in values', query: makeQueryWithWireDelimiters() },
];
