import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';
import useUrlQuery from 'hooks/useUrlQuery';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import isEmpty from 'lodash-es/isEmpty';
import _noop from 'lodash-es/noop';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import EmptyWidget from '../EmptyWidget';
import { MenuItemKeys } from '../WidgetHeader/contants';
import { GridCardGraphProps } from './types';
import WidgetGraphComponent from './WidgetGraphComponent';

function GridCardGraph({
	widget,
	name,
	onClickHandler = _noop,
	headerMenuList = [MenuItemKeys.View],
	isQueryEnabled,
	threshold,
	variables,
	fillSpans = false,
}: GridCardGraphProps): JSX.Element {
	const dispatch = useDispatch();
	const [errorMessage, setErrorMessage] = useState<string>();
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);

		if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					parseInt(getTimeString(startTime), 10),
					parseInt(getTimeString(endTime), 10),
				]),
			);
		}
	};

	useEffect(() => {
		window.addEventListener('popstate', handleBackNavigation);

		return (): void => {
			window.removeEventListener('popstate', handleBackNavigation);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const graphRef = useRef<HTMLDivElement>(null);

	const isVisible = useIntersectionObserver(graphRef, undefined, true);

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

	const updatedQuery = useStepInterval(widget?.query);

	const isEmptyWidget =
		widget?.id === PANEL_TYPES.EMPTY_WIDGET || isEmpty(widget);

	const queryEnabledCondition =
		isVisible &&
		!isEmptyWidget &&
		isQueryEnabled &&
		widget.panelTypes !== PANEL_TYPES.LIST;

	const queryResponse = useGetQueryRange(
		{
			selectedTime: widget?.timePreferance,
			graphType: getGraphType(widget.panelTypes),
			query: updatedQuery,
			globalSelectedInterval,
			variables: getDashboardVariables(variables),
		},
		{
			queryKey: [
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
				widget?.query,
				widget?.panelTypes,
				widget.timePreferance,
			],
			keepPreviousData: true,
			enabled: queryEnabledCondition,
			refetchOnMount: false,
			onError: (error) => {
				setErrorMessage(error.message);
			},
		},
	);

	const isEmptyLayout = widget?.id === PANEL_TYPES.EMPTY_WIDGET;

	const containerDimensions = useResizeObserver(graphRef);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, queryResponse]);

	if (queryResponse.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	const chartData = getUPlotChartData(queryResponse?.data?.payload, fillSpans);

	const isDarkMode = useIsDarkMode();

	const menuList =
		widget.panelTypes === PANEL_TYPES.TABLE ||
		widget.panelTypes === PANEL_TYPES.LIST
			? headerMenuList.filter((menu) => menu !== MenuItemKeys.CreateAlerts)
			: headerMenuList;

	const [graphVisibility, setGraphVisibility] = useState<boolean[]>(
		Array(queryResponse.data?.payload?.data.result.length || 0).fill(true),
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
				onClickHandler,
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
			queryResponse.data?.payload,
			containerDimensions,
			isDarkMode,
			onDragSelect,
			onClickHandler,
			minTimeScale,
			maxTimeScale,
			graphVisibility,
			setGraphVisibility,
			widget.panelTypes,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			{isEmptyLayout ? (
				<EmptyWidget />
			) : (
				<WidgetGraphComponent
					data={chartData}
					options={options}
					widget={widget}
					queryResponse={queryResponse}
					errorMessage={errorMessage}
					isWarning={false}
					name={name}
					onDragSelect={onDragSelect}
					threshold={threshold}
					headerMenuList={menuList}
					onClickHandler={onClickHandler}
					graphVisibiltyState={graphVisibility}
					setGraphVisibility={setGraphVisibility}
					isFetchingResponse={queryResponse.isFetching}
				/>
			)}
		</div>
	);
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
	onClickHandler: undefined,
	isQueryEnabled: true,
	threshold: undefined,
	headerMenuList: [MenuItemKeys.View],
};

export default memo(GridCardGraph);
