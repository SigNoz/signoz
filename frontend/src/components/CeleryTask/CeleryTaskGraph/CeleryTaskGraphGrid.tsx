import './CeleryTaskGraph.style.scss';

import { CeleryTaskData } from '../CeleryTaskDetail/CeleryTaskDetail';
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
	onClick: (task: CeleryTaskData) => void;
	queryEnabled: boolean;
}): JSX.Element {
	const bottomWidgetData = [
		celeryTasksByWorkerWidgetData,
		celeryErrorByWorkerWidgetData,
		celeryLatencyByWorkerWidgetData,
	];

	return (
		<div className="celery-task-graph-grid-container">
			<div className="celery-task-graph-grid">
				<CeleryTaskHistogram onClick={onClick} queryEnabled={queryEnabled} />
				<CeleryTaskGraph
					key={celeryWorkerOnlineWidgetData.id}
					widgetData={celeryWorkerOnlineWidgetData}
					onClick={onClick}
					queryEnabled={queryEnabled}
				/>
			</div>
			<div className="celery-task-graph-grid">
				<CeleryTaskLatencyGraph onClick={onClick} queryEnabled={queryEnabled} />
				<CeleryTaskGraph
					key={celeryActiveTasksWidgetData.id}
					widgetData={celeryActiveTasksWidgetData}
					onClick={onClick}
					queryEnabled={queryEnabled}
				/>
			</div>
			<div className="celery-task-graph-grid-bottom">
				{bottomWidgetData.map((widgetData) => (
					<CeleryTaskGraph
						key={widgetData.id}
						widgetData={widgetData}
						onClick={onClick}
						queryEnabled={queryEnabled}
					/>
				))}
			</div>
		</div>
	);
}
