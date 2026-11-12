import { initialQueriesMap } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { isMetricQuery } from '../isMetricQuery';

function builderOver(dataSource: DataSource): Query {
	return initialQueriesMap[dataSource];
}

describe('isMetricQuery', () => {
	it('is true for a metrics builder query', () => {
		expect(isMetricQuery(builderOver(DataSource.METRICS))).toBe(true);
	});

	it('is false for logs and traces, which Distribution does not read yet', () => {
		expect(isMetricQuery(builderOver(DataSource.LOGS))).toBe(false);
		expect(isMetricQuery(builderOver(DataSource.TRACES))).toBe(false);
	});

	it('is true for PromQL and ClickHouse', () => {
		const base = builderOver(DataSource.LOGS);
		expect(isMetricQuery({ ...base, queryType: EQueryType.PROM })).toBe(true);
		expect(isMetricQuery({ ...base, queryType: EQueryType.CLICKHOUSE })).toBe(
			true,
		);
	});
});
