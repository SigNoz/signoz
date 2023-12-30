import { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

export interface LimitFilterProps {
	onChange: (values: number | null) => void;
	formula: IBuilderFormula;
}
