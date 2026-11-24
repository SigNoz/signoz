import type { SelectProps } from 'antd';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import type { ReduceOperators } from 'types/common/queryBuilder';

export type ReduceToFilterProps = Omit<SelectProps, 'onChange' | 'value'> & {
	query: IBuilderQuery;
	onChange: (value: ReduceOperators) => void;
};
