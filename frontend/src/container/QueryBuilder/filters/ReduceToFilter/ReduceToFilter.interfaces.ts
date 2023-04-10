import { SelectProps } from 'antd';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

export type ReduceToFilterProps = Omit<SelectProps, 'onChange' | 'value'> & {
	query: IBuilderQueryForm;
	onChange: (value: string) => void;
};
