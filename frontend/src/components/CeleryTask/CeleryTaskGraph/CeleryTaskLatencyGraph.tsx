import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { Button } from 'container/MetricsApplication/Tabs/styles';
import { onGraphClickHandler } from 'container/MetricsApplication/Tabs/util';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { getStartAndEndTimesInMilliseconds } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	applyCeleryFilterOnWidgetData,
	createFiltersFromData,
	getFiltersFromQueryParams,
} from '../CeleryUtils';
import { useNavigateToTraces } from '../useNavigateToTraces';
import { celeryTaskLatencyWidgetData } from './CeleryTaskGraphUtils';

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
	queryEnabled,
	checkIfDataExists,
}: {
	queryEnabled: boolean;
	checkIfDataExists?: (isDataAvailable: boolean) => void;
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
		logEvent('MQ Celery: Task latency graph tab clicked', {
			taskName: urlQuery.get(QueryParams.taskName),
			graphState: key,
		});
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

	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);
	const [entityData, setEntityData] = useState<{
		entity: string;
		value: string;
	}>();

	const handleSetTimeStamp = useCallback((selectTime: number) => {
		setSelectedTimeStamp(selectTime);
	}, []);

	const onGraphClick = useCallback(
		(type: string): OnClickPluginOpts['onClick'] => (
			xValue,
			yValue,
			mouseX,
			mouseY,
			data,
		): Promise<void> => {
			const [firstDataPoint] = Object.entries(data || {});
			const [entity, value] = firstDataPoint;
			setEntityData({
				entity,
				value,
			});

			return onGraphClickHandler(handleSetTimeStamp)(
				xValue,
				yValue,
				mouseX,
				mouseY,
				type,
			);
		},
		[handleSetTimeStamp],
	);

	const navigateToTraces = useNavigateToTraces();

	const goToTraces = useCallback(() => {
		const { start, end } = getStartAndEndTimesInMilliseconds(selectedTimeStamp);
		const filters = createFiltersFromData({
			[entityData?.entity as string]: entityData?.value,
		});
		navigateToTraces(filters, start, end, true);
	}, [entityData, navigateToTraces, selectedTimeStamp]);

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
					<>
						<Button
							type="default"
							size="small"
							id="Celery_p99_latency_button"
							onClick={goToTraces}
						>
							View Traces
						</Button>
						<GridCard
							widget={updatedWidgetData}
							headerMenuList={[...ViewMenuAction]}
							onDragSelect={onDragSelect}
							onClickHandler={onGraphClick('Celery_p99_latency')}
							isQueryEnabled={queryEnabled}
							dataAvailable={checkIfDataExists}
						/>
					</>
				)}

				{graphState === CeleryTaskGraphState.P95 && (
					<>
						<Button
							type="default"
							size="small"
							id="Celery_p95_latency_button"
							onClick={goToTraces}
						>
							View Traces
						</Button>
						<GridCard
							widget={updatedWidgetData}
							headerMenuList={[...ViewMenuAction]}
							onDragSelect={onDragSelect}
							onClickHandler={onGraphClick('Celery_p95_latency')}
							isQueryEnabled={queryEnabled}
							dataAvailable={checkIfDataExists}
						/>
					</>
				)}
				{graphState === CeleryTaskGraphState.P90 && (
					<>
						<Button
							type="default"
							size="small"
							id="Celery_p90_latency_button"
							onClick={goToTraces}
						>
							View Traces
						</Button>
						<GridCard
							widget={updatedWidgetData}
							headerMenuList={[...ViewMenuAction]}
							onDragSelect={onDragSelect}
							onClickHandler={onGraphClick('Celery_p90_latency')}
							isQueryEnabled={queryEnabled}
							dataAvailable={checkIfDataExists}
						/>
					</>
				)}
			</div>
		</Card>
	);
}

export default CeleryTaskLatencyGraph;

CeleryTaskLatencyGraph.defaultProps = {
	checkIfDataExists: undefined,
};
