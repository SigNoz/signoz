import { SelectProps } from 'antd';
import { Dashboard } from 'types/api/dashboard/getAll';

export const getSelectOptions = (data: Dashboard[]): SelectProps['options'] =>
	data.map(({ id, data }) => ({
		label: data.title,
		value: id,
	}));
