import { FC, useMemo } from 'react';
import Spinner from 'components/Spinner';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

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
	panelMode,
	enableDrillDown = false,
	onColumnWidthsChange,
}: PanelWrapperProps): JSX.Element {
	const Component = PanelTypeVsPanelWrapper[
		selectedGraph || widget.panelTypes
	] as FC<PanelWrapperProps>;

	const groupByPerQuery = useMemo<Record<string, BaseAutocompleteData[]>>(() => {
		if (!widget.query.builder) {
			return {};
		}
		const { queryData } = widget.query.builder;
		return queryData.reduce<Record<string, BaseAutocompleteData[]>>(
			(acc, query) => {
				acc[query.queryName] = query.groupBy ?? [];
				return acc;
			},
			{},
		);
	}, [widget]);

	if (!Component) {
		return <></>;
	}

	if (queryResponse.isFetching || queryResponse.isLoading) {
		return <Spinner height="100%" size="large" tip="Loading..." />;
	}

	return (
		<Component
			panelMode={panelMode}
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
			onColumnWidthsChange={onColumnWidthsChange}
			groupByPerQuery={groupByPerQuery}
		/>
	);
}

export default PanelWrapper;
