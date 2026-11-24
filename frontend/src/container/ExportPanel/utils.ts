import type { SelectProps } from 'antd';
import type { ExportDashboard } from 'hooks/dashboard/useExportDashboards';

export const getSelectOptions = (
	data: ExportDashboard[],
): SelectProps['options'] =>
	data.map(({ id, title }) => ({
		label: title,
		value: id,
	}));
