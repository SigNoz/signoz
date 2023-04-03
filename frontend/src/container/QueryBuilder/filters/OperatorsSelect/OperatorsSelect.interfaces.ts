import { SelectProps } from 'antd';

export type OperatorsSelectProps = Omit<SelectProps, 'onChange' | 'value'> & {
	operators: string[];
	onChange: (value: string) => void;
	value: string;
};
