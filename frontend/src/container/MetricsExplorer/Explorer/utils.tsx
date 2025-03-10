import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export const splitQueryIntoOneChartPerQuery = (query: Query): Query[] =>
	query.builder.queryData.map((currentQuery) => ({
		...query,
		id: uuid(),
		builder: {
			...query.builder,
			queryData: [currentQuery],
		},
	}));
