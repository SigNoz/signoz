export enum EDataSource {
	METRICS = 0,
	TRACES,
	LOGS,
}

export enum EQueryType {
	QUERY_BUILDER = 0,
	CLICKHOUSE,
	PROM,
}

export enum EAggregateOperator {
	NOOP = 19,
	COUNT = 0,
	COUNT_DISTINCT = 1,
	SUM = 2,
	AVG = 3,
	MAX = 4,
	MIN = 5,
	P05 = 6,
	P10 = 7,
	P20 = 8,
	P25 = 9,
	P50 = 10,
	P75 = 11,
	P90 = 12,
	P95 = 13,
	P99 = 14,
	RATE_SUM = 15,
	RATE_AVG = 16,
	RATE_MAX = 17,
	RATE_MIN = 18,
}
