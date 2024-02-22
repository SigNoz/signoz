import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type QueryProps = {
	index: number;
	isAvailableToDisable: boolean;
	query: IBuilderQuery;
	queryVariant: 'static' | 'dropdown';
	isListViewPanel?: boolean;
	showFunctions?: boolean;
} & Pick<QueryBuilderProps, 'filterConfigs' | 'queryComponents'>;
