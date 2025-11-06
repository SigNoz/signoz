import isEqual from 'lodash-es/isEqual';
import { FC, memo } from 'react';

import { PanelTypeVsPanelWrapper } from './constants';
import { PanelWrapperProps } from './panelWrapper.types';

function PanelWrapper({
	widget,
	queryResponse,
	setRequestData,
	isFullViewMode,
	setGraphVisibility,
	graphVisibility,
	onToggleModelHandler,
	onClickHandler,
	onDragSelect,
	selectedGraph,
	tableProcessedDataRef,
	customTooltipElement,
	searchTerm,
	openTracesButton,
	onOpenTraceBtnClick,
	customSeries,
	customOnRowClick,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const Component = PanelTypeVsPanelWrapper[
		selectedGraph || widget.panelTypes
	] as FC<PanelWrapperProps>;

	if (!Component) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}
	return (
		<Component
			widget={widget}
			queryResponse={queryResponse}
			setRequestData={setRequestData}
			isFullViewMode={isFullViewMode}
			setGraphVisibility={setGraphVisibility}
			graphVisibility={graphVisibility}
			onToggleModelHandler={onToggleModelHandler}
			onClickHandler={onClickHandler}
			onDragSelect={onDragSelect}
			selectedGraph={selectedGraph}
			tableProcessedDataRef={tableProcessedDataRef}
			customTooltipElement={customTooltipElement}
			searchTerm={searchTerm}
			openTracesButton={openTracesButton}
			onOpenTraceBtnClick={onOpenTraceBtnClick}
			customOnRowClick={customOnRowClick}
			customSeries={customSeries}
			enableDrillDown={enableDrillDown}
		/>
	);
}

function arePropsEqual(
	prevProps: PanelWrapperProps,
	nextProps: PanelWrapperProps,
): boolean {
	// Use deep equality check for complex props like widget and queryResponse
	// This prevents unnecessary re-renders when these objects have the same content
	// but different references
	return isEqual(prevProps, nextProps);
}

export default memo(PanelWrapper, arePropsEqual);
