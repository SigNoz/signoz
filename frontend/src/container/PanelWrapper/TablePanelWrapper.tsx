import { PANEL_TYPES } from 'constants/queryBuilder';
import GridTableComponent from 'container/GridTableComponent';
import { GRID_TABLE_CONFIG } from 'container/GridTableComponent/config';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import { PanelWrapperProps } from './panelWrapper.types';

function TablePanelWrapper({
	widget,
	queryResponse,
	tableProcessedDataRef,
	searchTerm,
	openTracesButton,
	onOpenTraceBtnClick,
	customOnRowClick,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const panelData =
		(queryResponse.data?.payload?.data?.result?.[0] as any)?.table || [];
	const { thresholds } = widget;

	const queryRangeRequest = queryResponse.data?.params as QueryRangeRequestV5;

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
			customOnRowClick={customOnRowClick}
			widgetId={widget.id}
			renderColumnCell={widget.renderColumnCell}
			customColTitles={widget.customColTitles}
			contextLinks={widget.contextLinks}
			enableDrillDown={enableDrillDown}
			panelType={widget.panelTypes}
			queryRangeRequest={queryRangeRequest}
			decimalPrecision={widget.decimalPrecision}
			hiddenColumns={widget.hiddenColumns}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...GRID_TABLE_CONFIG}
		/>
	);
}

export default TablePanelWrapper;
