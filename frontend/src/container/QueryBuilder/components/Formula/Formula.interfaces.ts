import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';

export type FormulaProps = {
	formula: IBuilderFormula;
	index: number;
	query: IBuilderQuery;
	filterConfigs: Partial<QueryBuilderProps['filterConfigs']>;
	isAdditionalFilterEnable: boolean;
};
