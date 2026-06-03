import { IQueryBuilderState } from 'constants/queryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface InitialStateI {
	search: string;
}

export interface ContextValueI {
	values: InitialStateI;
	onChangeHandler: (type: IQueryBuilderState) => (value: string) => void;
	onSubmitHandler: VoidFunction;
}

export type Option = {
	value: string;
	label: string;
	selected?: boolean;
	dataType?: string;
	isIndexed?: boolean;
	type?: string;
};

export type QueryProps = {
	index: number;
	isAvailableToDisable: boolean;
	query: IBuilderQuery;
	queryVariant?: 'static' | 'dropdown';
	isListViewPanel?: boolean;
	showFunctions?: boolean;
	version: string;
	showSpanScopeSelector?: boolean;
	showOnlyWhereClause?: boolean;
	showTraceOperator?: boolean;
	hasTraceOperator?: boolean;
	signalSource?: string;
	isMultiQueryAllowed?: boolean;
} & Pick<QueryBuilderProps, 'filterConfigs' | 'queryComponents'>;
