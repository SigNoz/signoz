import { FC } from 'react';

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
			customSeries={customSeries}
		/>
	);
}

export default PanelWrapper;
