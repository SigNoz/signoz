import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { StringOperators } from 'types/common/queryBuilder';

const initialMetricsQuery = initialQueriesMap.metrics;

export const initialQuery: Query = {
	...initialMetricsQuery,
	builder: {
		...initialMetricsQuery.builder,
		queryData: initialMetricsQuery.builder.queryData.map((item) => ({
			...item,
			aggregateOperator: StringOperators.NOOP,
		})),
	},
};
