import { PANEL_TYPES } from 'constants/queryBuilder';
import GridTableComponent from 'container/GridTableComponent';
import { GRID_TABLE_CONFIG } from 'container/GridTableComponent/config';

import { PanelWrapperProps } from './panelWrapper.types';

function TablePanelWrapper({
	widget,
	queryResponse,
	tableProcessedDataRef,
	searchTerm,
	openTracesButton,
	onOpenTraceBtnClick,
}: PanelWrapperProps): JSX.Element {
	const panelData =
		(queryResponse.data?.payload?.data?.result?.[0] as any)?.table || [];
	const { thresholds } = widget;
	return (
		<GridTableComponent
			data={panelData}
			query={widget.query}
			thresholds={thresholds}
			columnUnits={widget.columnUnits}
			tableProcessedDataRef={tableProcessedDataRef}
			sticky={widget.panelTypes === PANEL_TYPES.TABLE}
			searchTerm={searchTerm}
			openTracesButton={openTracesButton}
			onOpenTraceBtnClick={onOpenTraceBtnClick}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...GRID_TABLE_CONFIG}
		/>
	);
}

export default TablePanelWrapper;
