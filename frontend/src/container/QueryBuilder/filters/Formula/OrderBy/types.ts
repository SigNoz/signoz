import { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

export interface OrderByProps {
	formula: IBuilderFormula;
	onChange: (value: IBuilderFormula['orderBy']) => void;
}
