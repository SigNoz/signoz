import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export const splitQueryIntoOneChartPerQuery = (query: Query): Query[] => {
	const queries: Query[] = [];

	query.builder.queryData.forEach((currentQuery) => {
		const newQuery = {
			...query,
			id: uuid(),
			builder: {
				...query.builder,
				queryData: [currentQuery],
				queryFormulas: [],
			},
		};
		queries.push(newQuery);
	});

	query.builder.queryFormulas.forEach((currentFormula) => {
		const newQuery = {
			...query,
			id: uuid(),
			builder: {
				...query.builder,
				queryFormulas: [currentFormula],
				queryData: query.builder.queryData.map((currentQuery) => ({
					...currentQuery,
					disabled: true,
				})),
			},
		};
		queries.push(newQuery);
	});

	return queries;
};
