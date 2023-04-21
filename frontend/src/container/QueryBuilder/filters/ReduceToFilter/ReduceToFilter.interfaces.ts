import { SelectProps } from 'antd';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { ReduceOperators } from 'types/common/queryBuilder';

export type ReduceToFilterProps = Omit<SelectProps, 'onChange' | 'value'> & {
	query: IBuilderQueryForm;
	onChange: (value: ReduceOperators) => void;
};
