import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';

export type FormulaProps = {
	formula: IBuilderFormula;
	index: number;
	query: IBuilderQuery;
	isQBV2?: boolean;
};
