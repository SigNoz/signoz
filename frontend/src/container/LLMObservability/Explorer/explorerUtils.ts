import { initialQueriesMap } from 'constants/queryBuilder';
import { getActiveBuilder } from 'lib/query/builderSlot';
import { cloneDeep } from 'lodash-es';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';
import { parseListOrderBy } from 'utils/explorerUtils';

export const getListViewQuery = (
	stagedQuery: Query,
	orderBy?: string,
): Query => {
	const query = stagedQuery
		? cloneDeep(stagedQuery)
		: cloneDeep(initialQueriesMap.traces);

	const orderByPayload: OrderByPayload[] = orderBy
		? [parseListOrderBy(orderBy)]
		: [];

	const { queryData: builderQueries } = getActiveBuilder(query);
	for (let i = 0; i < builderQueries.length; i++) {
		const queryData = builderQueries[i];
		queryData.groupBy = [];
		queryData.having = {
			expression: '',
		};
		queryData.orderBy = orderByPayload;
	}

	return query;
};
