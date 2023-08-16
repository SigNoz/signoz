import { SelectProps } from 'antd';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { ReduceOperators } from 'types/common/queryBuilder';

export type ReduceToFilterProps = Omit<SelectProps, 'onChange' | 'value'> & {
	query: IBuilderQuery;
	onChange: (value: ReduceOperators) => void;
};
