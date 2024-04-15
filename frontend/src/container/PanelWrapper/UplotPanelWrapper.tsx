import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import _noop from 'lodash-es/noop';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { PanelWrapperProps } from './panelWrapper.types';

function UplotPanelWrapper({
	queryResponse,
	widget,
	isFullViewMode,
	setGraphVisibility,
	graphVisibility,
	onToggleModelHandler,
	onClickHandler,
	onDragSelect,
	selectedGraph,
}: PanelWrapperProps): JSX.Element {
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const isDarkMode = useIsDarkMode();
	const lineChartRef = useRef<ToggleGraphProps>();
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const { currentQuery } = useQueryBuilder();

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

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [queryResponse]);

	const containerDimensions = useResizeObserver(graphRef);

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
	}, [queryResponse.data?.payload.data.result, setGraphVisibility, widget.id]);

	if (queryResponse.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		// eslint-disable-next-line no-param-reassign
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	const chartData = getUPlotChartData(
		queryResponse?.data?.payload,
		widget.fillSpans,
	);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				id: widget?.id,
				apiResponse: queryResponse.data?.payload,
				dimensions: containerDimensions,
				isDarkMode,
				onDragSelect,
				yAxisUnit: widget?.yAxisUnit,
				onClickHandler: onClickHandler || _noop,
				thresholds: widget.thresholds,
				minTimeScale,
				maxTimeScale,
				softMax: widget.softMax === undefined ? null : widget.softMax,
				softMin: widget.softMin === undefined ? null : widget.softMin,
				graphsVisibilityStates: graphVisibility,
				setGraphsVisibilityStates: setGraphVisibility,
				panelType: selectedGraph || widget.panelTypes,
				currentQuery,
			}),
		[
			widget?.id,
			widget?.yAxisUnit,
			widget.thresholds,
			widget.softMax,
			widget.softMin,
			widget.panelTypes,
			queryResponse.data?.payload,
			containerDimensions,
			isDarkMode,
			onDragSelect,
			onClickHandler,
			minTimeScale,
			maxTimeScale,
			graphVisibility,
			setGraphVisibility,
			selectedGraph,
			currentQuery,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={options} data={chartData} ref={lineChartRef} />
			{isFullViewMode && setGraphVisibility && (
				<GraphManager
					data={chartData}
					name={widget.id}
					options={options}
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

export default UplotPanelWrapper;
