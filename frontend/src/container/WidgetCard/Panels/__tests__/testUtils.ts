import { initialQueryState } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';

export function getMockQueryData(): QueryData {
	return {
		lowerBoundSeries: [],
		upperBoundSeries: [],
		predictedSeries: [],
		anomalyScores: [],
		metric: {},
		queryName: 'test-query-name',
		legend: 'test-legend',
		values: [],
		quantity: [],
		unit: 'test-unit',
		table: {
			rows: [],
			columns: [],
		},
		metaData: {
			alias: 'test-alias',
			index: 0,
			queryName: 'test-query-name',
		},
	};
}

export function getMockQuery(overrides?: Partial<Query>): Query {
	return {
		...initialQueryState,
		queryType: EQueryType.QUERY_BUILDER,
		...overrides,
	};
}
