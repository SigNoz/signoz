import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
} from 'constants/queryBuilder';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

export const defaultLiveQueryDataConfig: Partial<IBuilderQuery> = {
	aggregateOperator: LogsAggregatorOperator.NOOP,
	disabled: true,
	pageSize: 10,
	orderBy: [{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC }],
};

type GetDefaultCompositeQueryParams = {
	query: Query;
	initialQueryData: IBuilderQuery;
	customQueryData?: Partial<IBuilderQuery>;
};

export const constructCompositeQuery = ({
	query,
	initialQueryData,
	customQueryData,
}: GetDefaultCompositeQueryParams): Query => ({
	...query,
	builder: {
		...query?.builder,
		queryData: query?.builder?.queryData?.map((item) => ({
			...initialQueryData,
			...item,
			...customQueryData,
		})),
	},
});

export const liveLogsCompositeQuery = constructCompositeQuery({
	query: initialQueriesMap.logs,
	initialQueryData: initialQueryBuilderFormValuesMap.logs,
	customQueryData: defaultLiveQueryDataConfig,
});

export const idObject: BaseAutocompleteData = {
	key: 'id',
	type: '',
	dataType: DataTypes.String,
	isColumn: true,
};
