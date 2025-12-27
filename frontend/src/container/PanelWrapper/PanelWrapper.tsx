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
	// Destructure to separate props that need deep comparison from the rest
	const {
		widget: prevWidget,
		queryResponse: prevQueryResponse,
		...prevRest
	} = prevProps;
	const {
		widget: nextWidget,
		queryResponse: nextQueryResponse,
		...nextRest
	} = nextProps;

	// Shallow equality check for all other props (primitives, functions, refs, arrays)
	const restKeys = Object.keys(prevRest) as Array<
		keyof Omit<PanelWrapperProps, 'widget' | 'queryResponse'>
	>;

	if (restKeys.some((key) => prevRest[key] !== nextRest[key])) {
		return false;
	}

	// Deep equality only for widget config and query response data payload
	return (
		isEqual(prevWidget, nextWidget) &&
		isEqual(prevQueryResponse.data?.payload, nextQueryResponse.data?.payload)
	);
}

export default memo(PanelWrapper, arePropsEqual);
