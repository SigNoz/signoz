import { DashboardData, IDashboardVariable } from 'types/api/dashboard/getAll';

export function sanitizeDashboardData(
	selectedData: DashboardData,
): DashboardData {
	if (!selectedData?.variables) {
		return selectedData;
	}

	const updatedVariables = Object.entries(selectedData.variables).reduce(
		(acc, [key, value]) => {
			const { selectedValue: _selectedValue, ...rest } = value;
			acc[key] = rest;
			return acc;
		},
		{} as Record<string, IDashboardVariable>,
	);

	return {
		...selectedData,
		variables: updatedVariables,
	};
}

export function downloadObjectAsJson(
	exportObj: unknown,
	exportName: string,
): void {
	const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
		JSON.stringify(exportObj),
	)}`;
	const downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute('href', dataStr);
	downloadAnchorNode.setAttribute('download', `${exportName}.json`);
	document.body.appendChild(downloadAnchorNode); // required for firefox
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

export const DEFAULT_ROW_NAME = 'Sample Row';
