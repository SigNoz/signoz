import { initialQueriesMap } from 'constants/queryBuilder';
import { cloneDeep } from 'lodash-es';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';

export const getListViewQuery = (
	stagedQuery: Query | null,
	orderBy?: string,
): Query | null => {
	if (!stagedQuery) return null;
	const query = stagedQuery
		? cloneDeep(stagedQuery)
		: cloneDeep(initialQueriesMap.traces);

	const orderByPayload: OrderByPayload[] = orderBy
		? [
				{
					columnName: orderBy.split(':')[0],
					order: orderBy.split(':')[1] as 'asc' | 'desc',
				},
		  ]
		: [];

	for (let i = 0; i < query.builder.queryData.length; i++) {
		const queryData = query.builder.queryData[i];
		queryData.groupBy = [];
		queryData.having = {
			expression: '',
		};
		queryData.orderBy = orderByPayload;
	}

	if (
		query.builder.queryTraceOperator &&
		query.builder.queryTraceOperator.length > 0
	) {
		for (let i = 0; i < query.builder.queryTraceOperator.length; i++) {
			const queryTraceOperator = query.builder.queryTraceOperator[i];
			queryTraceOperator.groupBy = [];
			queryTraceOperator.having = {
				expression: '',
			};
			queryTraceOperator.orderBy = orderByPayload;
		}
	}

	return query;
};
