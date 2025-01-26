import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { getStartAndEndTimesInMilliseconds } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import {
	applyCeleryFilterOnWidgetData,
	getFiltersFromQueryParams,
} from '../CeleryUtils';
import {
	celeryTaskLatencyWidgetData,
	celeryTimeSeriesTablesWidgetData,
} from './CeleryTaskGraphUtils';

interface TabData {
	label: string;
	key: string;
}

export enum CeleryTaskGraphState {
	P99 = 'p99',
	P95 = 'p95',
	P90 = 'p90',
}

function CeleryTaskLatencyGraph({
	onClick,
	queryEnabled,
}: {
	onClick: (task: CaptureDataProps) => void;
	queryEnabled: boolean;
}): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const isDarkMode = useIsDarkMode();

	const tabs: TabData[] = [
		{ label: CeleryTaskGraphState.P99, key: CeleryTaskGraphState.P99 },
		{ label: CeleryTaskGraphState.P95, key: CeleryTaskGraphState.P95 },
		{ label: CeleryTaskGraphState.P90, key: CeleryTaskGraphState.P90 },
	];

	const [graphState, setGraphState] = useState<CeleryTaskGraphState>(
		CeleryTaskGraphState.P99,
	);

	const handleTabClick = (key: CeleryTaskGraphState): void => {
		setGraphState(key as CeleryTaskGraphState);
	};

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

	const selectedFilters = useMemo(
		() =>
			getFiltersFromQueryParams(
				QueryParams.taskName,
				urlQuery,
				'celery.task_name',
			),
		[urlQuery],
	);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const celeryTaskLatencyData = useMemo(
		() => celeryTaskLatencyWidgetData(graphState, minTime, maxTime),
		[graphState, minTime, maxTime],
	);

	const updatedWidgetData = useMemo(
		() =>
			applyCeleryFilterOnWidgetData(selectedFilters || [], celeryTaskLatencyData),
		[celeryTaskLatencyData, selectedFilters],
	);

	const onGraphClick = (
		xValue: number,
		_yValue: number,
		_mouseX: number,
		_mouseY: number,
		data?: {
			[key: string]: string;
		},
	): void => {
		const { start, end } = getStartAndEndTimesInMilliseconds(xValue);

		// Extract entity and value from data
		const [firstDataPoint] = Object.entries(data || {});
		const [entity, value] = (firstDataPoint || ([] as unknown)) as [
			string,
			string,
		];

		onClick?.({
			entity,
			value,
			timeRange: [start, end],
			widgetData: celeryTimeSeriesTablesWidgetData(entity, value, 'Task Latency'),
		});
	};

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES}
			className="celery-task-graph-task-latency"
		>
			<Row className="celery-task-states">
				{tabs.map((tab, index) => (
					<Col
						key={tab.key}
						onClick={(): void => handleTabClick(tab.key as CeleryTaskGraphState)}
						className={`celery-task-states__tab ${
							tab.key === graphState ? 'celery-task-states__tab--selected' : ''
						}`}
						data-last-tab={index === tabs.length - 1}
					>
						<div className="celery-task-states__label-wrapper">
							<div className="celery-task-states__label">
								{tab.label.toUpperCase()}
							</div>
						</div>
						{tab.key === graphState && (
							<div className="celery-task-states__indicator" />
						)}
					</Col>
				))}
			</Row>
			<div className="celery-task-graph-grid-content">
				{graphState === CeleryTaskGraphState.P99 && (
					<GridCard
						widget={updatedWidgetData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						onClickHandler={onGraphClick}
						isQueryEnabled={queryEnabled}
					/>
				)}

				{graphState === CeleryTaskGraphState.P95 && (
					<GridCard
						widget={updatedWidgetData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						onClickHandler={onGraphClick}
						isQueryEnabled={queryEnabled}
					/>
				)}
				{graphState === CeleryTaskGraphState.P90 && (
					<GridCard
						widget={updatedWidgetData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						onClickHandler={onGraphClick}
						isQueryEnabled={queryEnabled}
					/>
				)}
			</div>
		</Card>
	);
}

export default CeleryTaskLatencyGraph;
