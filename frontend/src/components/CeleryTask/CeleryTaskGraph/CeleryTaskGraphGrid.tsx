import './CeleryTaskGraph.style.scss';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import CeleryTaskGraph from './CeleryTaskGraph';
import {
	celeryActiveTasksWidgetData,
	celeryErrorByWorkerWidgetData,
	celeryLatencyByWorkerWidgetData,
	celeryTasksByWorkerWidgetData,
	celeryWorkerOnlineWidgetData,
} from './CeleryTaskGraphUtils';
import CeleryTaskHistogram from './CeleryTaskHistogram';
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

	const celeryWorkerOnlineData = useMemo(
		() => celeryWorkerOnlineWidgetData(minTime, maxTime),
		[minTime, maxTime],
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

	return (
		<div className="celery-task-graph-grid-container">
			<div className="celery-task-graph-grid">
				<CeleryTaskHistogram queryEnabled={queryEnabled} />
				<CeleryTaskGraph
					key={celeryWorkerOnlineData.id}
					widgetData={celeryWorkerOnlineData}
					queryEnabled={queryEnabled}
				/>
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
