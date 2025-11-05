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
	// TODO: Figure out why onClickHandler is causing re-render of the component
	const { onClickHandler: prevOnClickHandler, ...restPrevProps } = prevProps;
	const { onClickHandler: nextOnClickHandler, ...restNextProps } = nextProps;
	return isEqual(restPrevProps, restNextProps);
}

export default memo(PanelWrapper, arePropsEqual);
