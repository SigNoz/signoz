import { QueryProps } from 'container/QueryBuilder/components/Query/Query.interfaces';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderFormula,
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	BaseBuilderQuery,
	LogBuilderQuery,
	MetricBuilderQuery,
	QueryFunction,
	TraceBuilderQuery,
} from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import { SelectOption } from './select';

type UseQueryOperationsParams = Pick<QueryProps, 'index' | 'query'> &
	Pick<QueryBuilderProps, 'filterConfigs'> & {
		isForTraceOperator?: boolean;
		formula?: IBuilderFormula;
		isListViewPanel?: boolean;
		entityVersion: string;
	};

// Generic type that can work with both legacy and V5 query types
export type HandleChangeQueryData<T = IBuilderQuery> = <
	Key extends keyof T,
	Value extends T[Key]
>(
	key: Key,
	value: Value,
) => void;

export type HandleChangeTraceOperatorData<T = IBuilderTraceOperator> = <
	Key extends keyof T,
	Value extends T[Key]
>(
	key: Key,
	value: Value,
) => void;

// Legacy version for backward compatibility
export type HandleChangeQueryDataLegacy = HandleChangeQueryData<IBuilderQuery>;

// V5 version for new API
export type HandleChangeQueryDataV5 = HandleChangeQueryData<
	BaseBuilderQuery & (TraceBuilderQuery | LogBuilderQuery | MetricBuilderQuery)
>;

export type HandleChangeFormulaData = <
	Key extends keyof IBuilderFormula,
	Value extends IBuilderFormula[Key]
>(
	key: Key,
	value: Value,
) => void;

export type UseQueryOperations = (
	params: UseQueryOperationsParams,
) => {
	isTracePanelType: boolean;
	isMetricsDataSource: boolean;
	operators: SelectOption<string, string>[];
	spaceAggregationOptions: SelectOption<string, string>[];
	listOfAdditionalFilters: string[];
	handleChangeOperator: (value: string) => void;
	handleSpaceAggregationChange: (value: string) => void;
	handleChangeAggregatorAttribute: (
		value: BaseAutocompleteData,
		isEditMode?: boolean,
		attributeKeys?: BaseAutocompleteData[],
	) => void;
	handleChangeDataSource: (newSource: DataSource) => void;
	handleDeleteQuery: () => void;
	handleChangeQueryData: HandleChangeQueryData;
	handleChangeFormulaData: HandleChangeFormulaData;
	handleQueryFunctionsUpdates: (functions: QueryFunction[]) => void;
	listOfAdditionalFormulaFilters: string[];
};
