import { DefaultOptionType } from 'antd/es/select';

export const filterOption = (
	inputValue: string,
	option: DefaultOptionType['options'][number],
): boolean => option.label.toLowerCase().includes(inputValue.toLowerCase());
