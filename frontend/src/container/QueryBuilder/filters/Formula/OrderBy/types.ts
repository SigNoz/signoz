import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';

export interface OrderByProps {
	formula: IBuilderFormula;
	query: IBuilderQuery;
	onChange: (value: IBuilderFormula['orderBy']) => void;
}

export type IOrderByFormulaFilterProps = OrderByProps;
