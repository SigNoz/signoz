import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';

import { CeleryTaskData } from '../CeleryTaskDetail/CeleryTaskDetail';
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
	onClick,
	queryEnabled,
}: {
	onClick: (task: CeleryTaskData) => void;

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

	const getGraphData = (graphData: any): void => {
		console.log('graphData', graphData);
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
						widget={celeryTaskLatencyWidgetData(graphState)}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						onClickHandler={(arg): void => {
							console.log('clicked', arg);
							onClick(arg as any);
						}}
						getGraphData={getGraphData}
						isQueryEnabled={queryEnabled}
					/>
				)}

				{graphState === CeleryTaskGraphState.P95 && (
					<GridCard
						widget={celeryTaskLatencyWidgetData(graphState)}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						onClickHandler={(arg): void => {
							console.log('clicked', arg);
							onClick(arg as any);
						}}
						getGraphData={getGraphData}
						isQueryEnabled={queryEnabled}
					/>
				)}
				{graphState === CeleryTaskGraphState.P90 && (
					<GridCard
						widget={celeryTaskLatencyWidgetData(graphState)}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						onClickHandler={(arg): void => {
							console.log('clicked', arg);
							onClick(arg as any);
						}}
						getGraphData={getGraphData}
						isQueryEnabled={queryEnabled}
					/>
				)}
			</div>
		</Card>
	);
}

export default CeleryTaskLatencyGraph;
