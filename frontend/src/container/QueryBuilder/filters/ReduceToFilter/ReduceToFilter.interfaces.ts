import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { ReduceOperators } from 'types/common/queryBuilder';

export type ReduceToFilterProps = {
	query: IBuilderQuery;
	onChange: (value: ReduceOperators) => void;
};
