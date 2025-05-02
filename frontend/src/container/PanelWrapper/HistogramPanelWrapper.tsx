import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotHistogramChartOptions } from 'lib/uPlotLib/getUplotHistogramChartOptions';
import _noop from 'lodash-es/noop';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useMemo, useRef } from 'react';

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
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

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
	}, [queryResponse.data?.payload.data.result, setGraphVisibility, widget.id]);

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
				onClickHandler: onClickHandler || _noop,
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
			onClickHandler,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={histogramOptions} data={histogramData} ref={lineChartRef} />
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
