import { SelectProps } from 'antd';
import { SelectOption } from 'types/common/select';

export type OperatorsSelectProps = Omit<SelectProps, 'onChange' | 'value'> & {
	operators: SelectOption<string, string>[];
	onChange: (value: string) => void;
	value: string;
};
