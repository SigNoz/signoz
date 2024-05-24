import GridTableComponent from 'container/GridTableComponent';
import { GRID_TABLE_CONFIG } from 'container/GridTableComponent/config';

import { PanelWrapperProps } from './panelWrapper.types';

function TablePanelWrapper({
	widget,
	queryResponse,
	tableProcessedDataRef,
}: PanelWrapperProps): JSX.Element {
	const panelData =
		queryResponse.data?.payload?.data.newResult.data.result || [];
	const { thresholds } = widget;
	return (
		<GridTableComponent
			data={panelData}
			query={widget.query}
			thresholds={thresholds}
			tableProcessedDataRef={tableProcessedDataRef}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...GRID_TABLE_CONFIG}
		/>
	);
}

export default TablePanelWrapper;
