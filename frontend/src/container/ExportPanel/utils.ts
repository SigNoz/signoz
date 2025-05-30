import { SelectProps } from 'antd';
import { Dashboard } from 'types/api/dashboard/getAll';

export const getSelectOptions = (data: Dashboard[]): SelectProps['options'] =>
	data.map(({ id, data }) => ({
		label: data.title,
		value: id,
	}));

export const filterOptions: SelectProps['filterOption'] = (
	input,
	options,
): boolean =>
	(options?.label?.toString() ?? '')
		?.toLowerCase()
		.includes(input.toLowerCase());
