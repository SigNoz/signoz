import './CeleryTaskGraph.style.scss';

import { Card, Typography } from 'antd';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import { useCeleryFilterOptions } from '../useCeleryFilterOptions';
import CeleryTaskBar from './CeleryTaskBar';
import CeleryTaskGraph from './CeleryTaskGraph';
import {
	celeryActiveTasksWidgetData,
	celeryErrorByWorkerWidgetData,
	celeryLatencyByWorkerWidgetData,
	celeryTasksByWorkerWidgetData,
} from './CeleryTaskGraphUtils';
import CeleryTaskLatencyGraph from './CeleryTaskLatencyGraph';

export default function CeleryTaskGraphGrid({
	onClick,
	queryEnabled,
}: {
	onClick: (task: CaptureDataProps) => void;
	queryEnabled: boolean;
}): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const celeryActiveTasksData = useMemo(
		() => celeryActiveTasksWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryErrorByWorkerData = useMemo(
		() => celeryErrorByWorkerWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryLatencyByWorkerData = useMemo(
		() => celeryLatencyByWorkerWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryTasksByWorkerData = useMemo(
		() => celeryTasksByWorkerWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const bottomWidgetData = [
		celeryTasksByWorkerData,
		celeryErrorByWorkerData,
		celeryLatencyByWorkerData,
	];

	const rightPanelTitle = [
		'Tasks/s by worker',
		'Error% by worker',
		'Latency by worker',
	];

	const { options } = useCeleryFilterOptions(
		'worker',
		'rate',
		DataSource.METRICS,
		'flower_task_runtime_seconds_sum',
		DataTypes.String,
		'tag',
	);

	return (
		<div className="celery-task-graph-grid-container">
			<div className="celery-task-graph-grid">
				<CeleryTaskBar queryEnabled={queryEnabled} onClick={onClick} />
				<Card className="celery-task-graph-worker-count">
					<div className="worker-count-header">
						<Typography.Text className="worker-count-header-text">
							Worker Count
						</Typography.Text>
					</div>
					<div className="worker-count-text-container">
						<Typography.Text className="celery-task-graph-worker-count-text">
							{options.filter((option) => option.value).length}
						</Typography.Text>
					</div>
				</Card>
			</div>
			<div className="celery-task-graph-grid">
				<CeleryTaskLatencyGraph onClick={onClick} queryEnabled={queryEnabled} />
				<CeleryTaskGraph
					key={celeryActiveTasksData.id}
					widgetData={celeryActiveTasksData}
					queryEnabled={queryEnabled}
				/>
			</div>
			<div className="celery-task-graph-grid-bottom">
				{bottomWidgetData.map((widgetData, index) => (
					<CeleryTaskGraph
						key={widgetData.id}
						widgetData={widgetData}
						onClick={onClick}
						queryEnabled={queryEnabled}
						rightPanelTitle={rightPanelTitle[index]}
						applyCeleryTaskFilter
					/>
				))}
			</div>
		</div>
	);
}
