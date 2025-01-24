import './CeleryTaskGraph.style.scss';

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
	const bottomWidgetData = [
		celeryTasksByWorkerWidgetData,
		celeryErrorByWorkerWidgetData,
		celeryLatencyByWorkerWidgetData,
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
					key={celeryWorkerOnlineWidgetData.id}
					widgetData={celeryWorkerOnlineWidgetData}
					queryEnabled={queryEnabled}
				/>
			</div>
			<div className="celery-task-graph-grid">
				<CeleryTaskLatencyGraph onClick={onClick} queryEnabled={queryEnabled} />
				<CeleryTaskGraph
					key={celeryActiveTasksWidgetData.id}
					widgetData={celeryActiveTasksWidgetData}
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
					/>
				))}
			</div>
		</div>
	);
}
