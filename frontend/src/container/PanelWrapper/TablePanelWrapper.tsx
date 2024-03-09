import { GRID_TABLE_CONFIG } from 'container/GridTableComponent/config';

import { PanelWrapperProps } from './panelWrapper.types';

function TablePanelWrapper({
	widget,
	queryResponse,
	name,
}: PanelWrapperProps): JSX.Element {
	const panelData =
		queryResponse.data?.payload?.data.newResult.data.result || [];
	const { thresholds } = widget;
	console.log({
		widget,
		queryResponse,
		name,
		thresholds,
		panelData,
		config: GRID_TABLE_CONFIG,
	});
	return <div>TablePanelWrapper</div>;
}

export default TablePanelWrapper;
