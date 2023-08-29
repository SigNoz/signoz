import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

export const liveLogsCompositeQuery: Query = {
	...initialQueriesMap.logs,
	builder: {
		...initialQueriesMap.logs.builder,
		queryData: [
			{
				...initialQueryBuilderFormValuesMap.logs,
				aggregateOperator: LogsAggregatorOperator.NOOP,
				disabled: true,
				pageSize: 10,
				orderBy: [{ columnName: 'timestamp', order: FILTERS.DESC }],
			},
		],
	},
};

export const idObject: BaseAutocompleteData = {
	key: 'id',
	type: '',
	dataType: 'string',
	isColumn: true,
};
