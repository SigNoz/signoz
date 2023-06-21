import { SelectProps } from 'antd';
import { PayloadProps as AllDashboardsData } from 'types/api/dashboard/getAll';

export const getSelectOptions = (
	data: AllDashboardsData,
): SelectProps['options'] =>
	data.map(({ uuid, data }) => ({
		label: data.title,
		value: uuid,
	}));
