import { ENTITY_VERSION_V4 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { getStartAndEndTimesInMilliseconds } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import {
	applyCeleryFilterOnWidgetData,
	getFiltersFromQueryParams,
} from '../CeleryUtils';
import { celeryTimeSeriesTablesWidgetData } from './CeleryTaskGraphUtils';

function CeleryTaskGraph({
	widgetData,
	onClick,
	getGraphData,
	queryEnabled,
	rightPanelTitle,
	panelType,
	openTracesButton,
	onOpenTraceBtnClick,
	applyCeleryTaskFilter,
	customErrorMessage,
	start,
	end,
	checkIfDataExists,
	analyticsEvent,
}: {
	widgetData: Widgets;
	onClick?: (task: CaptureDataProps) => void;
	getGraphData?: (graphData?: MetricRangePayloadProps['data']) => void;
	queryEnabled: boolean;
	rightPanelTitle?: string;
	panelType?: PANEL_TYPES;
	openTracesButton?: boolean;
	onOpenTraceBtnClick?: (record: RowData) => void;
	applyCeleryTaskFilter?: boolean;
	customErrorMessage?: string;
	start?: number;
	end?: number;
	checkIfDataExists?: (isDataAvailable: boolean) => void;
	analyticsEvent?: string;
}): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const isDarkMode = useIsDarkMode();

	const selectedFilters = useMemo(
		() =>
			getFiltersFromQueryParams(
				QueryParams.taskName,
				urlQuery,
				'celery.task_name',
			),
		[urlQuery],
	);

	const updatedWidgetData = useMemo(
		() => applyCeleryFilterOnWidgetData(selectedFilters || [], widgetData),
		[selectedFilters, widgetData],
	);

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, history, pathname, urlQuery],
	);

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES || panelType}
			className="celery-task-graph"
		>
			<GridCard
				widget={applyCeleryTaskFilter ? updatedWidgetData : widgetData}
				headerMenuList={[...ViewMenuAction]}
				onDragSelect={onDragSelect}
				onClickHandler={(xValue, _yValue, _mouseX, _mouseY, data): void => {
					const { start, end } = getStartAndEndTimesInMilliseconds(xValue);

					// Extract entity and value from data
					const [firstDataPoint] = Object.entries(data || {});
					const [entity, value] = firstDataPoint || [];

					const widgetData = celeryTimeSeriesTablesWidgetData(
						entity,
						value,
						rightPanelTitle || '',
					);

					onClick?.({
						entity,
						value,
						timeRange: [start, end],
						widgetData,
					});
				}}
				getGraphData={getGraphData}
				isQueryEnabled={queryEnabled}
				openTracesButton={openTracesButton}
				onOpenTraceBtnClick={onOpenTraceBtnClick}
				version={ENTITY_VERSION_V4}
				customErrorMessage={customErrorMessage}
				start={start}
				end={end}
				dataAvailable={checkIfDataExists}
				analyticsEvent={analyticsEvent}
			/>
		</Card>
	);
}

CeleryTaskGraph.defaultProps = {
	getGraphData: undefined,
	onClick: undefined,
	rightPanelTitle: undefined,
	panelType: PANEL_TYPES.TIME_SERIES,
	openTracesButton: false,
	onOpenTraceBtnClick: undefined,
	applyCeleryTaskFilter: false,
	customErrorMessage: undefined,
	start: undefined,
	end: undefined,
	checkIfDataExists: undefined,
	analyticsEvent: undefined,
};

export default CeleryTaskGraph;
