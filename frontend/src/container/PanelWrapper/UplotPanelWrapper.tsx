import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import history from 'lib/history';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import _noop from 'lodash-es/noop';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { PanelWrapperProps } from './panelWrapper.types';

function UplotPanelWrapper({
	queryResponse,
	widget,
	name,
}: PanelWrapperProps): JSX.Element {
	const dispatch = useDispatch();
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const isDarkMode = useIsDarkMode();
	const lineChartRef = useRef<ToggleGraphProps>();
	const graphRef = useRef<HTMLDivElement>(null);
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();

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

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}

			const { maxTime, minTime } = GetMinMax('custom', [
				startTimestamp,
				endTimestamp,
			]);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[dispatch, location.pathname, urlQuery],
	);

	const [graphVisibility, setGraphVisibility] = useState<boolean[]>(
		Array(queryResponse.data?.payload?.data.result.length || 0).fill(true),
	);

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: queryResponse.data?.payload.data.result || [],
			name,
		});
		setGraphVisibility(localStoredVisibilityState);
	}, [name, queryResponse.data?.payload.data.result]);

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
				onClickHandler: _noop,
				thresholds: widget.thresholds,
				minTimeScale,
				maxTimeScale,
				softMax: widget.softMax === undefined ? null : widget.softMax,
				softMin: widget.softMin === undefined ? null : widget.softMin,
				graphsVisibilityStates: graphVisibility,
				setGraphsVisibilityStates: setGraphVisibility,
				panelType: widget.panelTypes,
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
			minTimeScale,
			maxTimeScale,
			graphVisibility,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={options} data={chartData} ref={lineChartRef} />
		</div>
	);
}

export default UplotPanelWrapper;
