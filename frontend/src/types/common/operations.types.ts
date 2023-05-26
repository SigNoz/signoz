import { QueryProps } from 'container/QueryBuilder/components/Query/Query.interfaces';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { SelectOption } from './select';

type UseQueryOperationsParams = Pick<QueryProps, 'index' | 'query'>;

export type HandleChangeQueryData = <
	Key extends keyof IBuilderQuery,
	Value extends IBuilderQuery[Key]
>(
	key: Key,
	value: Value,
) => void;

export type UseQueryOperations = (
	params: UseQueryOperationsParams,
) => {
	isMetricsDataSource: boolean;
	operators: SelectOption<string, string>[];
	listOfAdditionalFilters: string[];
	handleChangeOperator: (value: string) => void;
	handleChangeAggregatorAttribute: (value: BaseAutocompleteData) => void;
	handleChangeDataSource: (newSource: DataSource) => void;
	handleDeleteQuery: () => void;
	handleChangeQueryData: HandleChangeQueryData;
};
