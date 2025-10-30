import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotHistogramChartOptions } from 'lib/uPlotLib/getUplotHistogramChartOptions';
import _noop from 'lodash-es/noop';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { buildHistogramData } from './histogram';
import { PanelWrapperProps } from './panelWrapper.types';

function HistogramPanelWrapper({
	queryResponse,
	widget,
	setGraphVisibility,
	graphVisibility,
	isFullViewMode,
	onToggleModelHandler,
	onClickHandler,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const legendScrollPositionRef = useRef<number>(0);
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);
	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
	} = useCoordinates();
	const { menuItemsConfig } = useGraphContextMenu({
		widgetId: widget.id || '',
		query: widget.query,
		graphData: clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
		contextLinks: widget.contextLinks,
		panelType: widget.panelTypes,
		queryRange: queryResponse,
	});

	const clickHandlerWithContextMenu = useCallback(
		(...args: any[]) => {
			const [
				,
				,
				,
				,
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				,
				focusedSeries,
			] = args;
			const data = getUplotClickData({
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				focusedSeries,
			});
			if (data && data?.record?.queryName) {
				onClick(data.coord, { ...data.record, label: data.label });
			}
		},
		[onClick],
	);

	const histogramData = buildHistogramData(
		queryResponse.data?.payload.data.result,
		widget?.bucketWidth,
		widget?.bucketCount,
		widget?.mergeAllActiveQueries,
	);

	useEffect(() => {
		if (toScrollWidgetId === widget.id) {
			graphRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
			graphRef.current?.focus();
			setToScrollWidgetId('');
		}
	}, [toScrollWidgetId, setToScrollWidgetId, widget.id]);
	const lineChartRef = useRef<ToggleGraphProps>();

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: queryResponse.data?.payload.data.result || [],
			name: widget.id,
		});
		if (setGraphVisibility) {
			setGraphVisibility(localStoredVisibilityState);
		}
	}, [
		queryResponse?.data?.payload?.data?.result,
		setGraphVisibility,
		widget.id,
	]);

	const histogramOptions = useMemo(
		() =>
			getUplotHistogramChartOptions({
				id: widget.id,
				dimensions: containerDimensions,
				isDarkMode,
				apiResponse: queryResponse.data?.payload,
				histogramData,
				panelType: widget.panelTypes,
				setGraphsVisibilityStates: setGraphVisibility,
				graphsVisibilityStates: graphVisibility,
				mergeAllQueries: widget.mergeAllActiveQueries,
				onClickHandler: enableDrillDown
					? clickHandlerWithContextMenu
					: onClickHandler ?? _noop,
				legendScrollPosition: legendScrollPositionRef.current,
				setLegendScrollPosition: (position: number) => {
					legendScrollPositionRef.current = position;
				},
			}),
		[
			containerDimensions,
			graphVisibility,
			histogramData,
			isDarkMode,
			queryResponse.data?.payload,
			setGraphVisibility,
			widget.id,
			widget.mergeAllActiveQueries,
			widget.panelTypes,
			clickHandlerWithContextMenu,
			enableDrillDown,
			onClickHandler,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={histogramOptions} data={histogramData} ref={lineChartRef} />
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
			{isFullViewMode && setGraphVisibility && !widget.mergeAllActiveQueries && (
				<GraphManager
					data={histogramData}
					name={widget.id}
					options={histogramOptions}
					yAxisUnit={widget.yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					setGraphsVisibilityStates={setGraphVisibility}
					graphsVisibilityStates={graphVisibility}
					lineChartRef={lineChartRef}
				/>
			)}
		</div>
	);
}

export default HistogramPanelWrapper;
