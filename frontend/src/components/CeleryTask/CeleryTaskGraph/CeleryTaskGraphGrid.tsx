import './CeleryTaskGraph.style.scss';

import { CeleryTaskData } from '../CeleryTaskDetail/CeleryTaskDetail';
import CeleryTaskGraph from './CeleryTaskGraph';
import {
	celeryActiveTasksWidgetData,
	celeryAllStateWidgetData,
	celeryErrorByWorkerWidgetData,
	celeryLatencyByWorkerWidgetData,
	celeryTaskLatencyWidgetData,
	celeryTasksByWorkerWidgetData,
	celeryWorkerOnlineWidgetData,
} from './CeleryTaskGraphUtils';

export default function CeleryTaskGraphGrid({
	onClick,
}: {
	onClick: (task: CeleryTaskData) => void;
}): JSX.Element {
	const widgetData = [
		celeryActiveTasksWidgetData,
		celeryWorkerOnlineWidgetData,
		celeryAllStateWidgetData,
		celeryTaskLatencyWidgetData,
	];

	const bottomWidgetData = [
		celeryTasksByWorkerWidgetData,
		celeryErrorByWorkerWidgetData,
		celeryLatencyByWorkerWidgetData,
	];

	return (
		<div className="celery-task-graph-grid-container">
			<div className="celery-task-graph-grid">
				{widgetData.map((widget) => (
					<CeleryTaskGraph key={widget.id} widgetData={widget} onClick={onClick} />
				))}
			</div>
			<div className="celery-task-graph-grid-bottom">
				{bottomWidgetData.map((widget) => (
					<CeleryTaskGraph key={widget.id} widgetData={widget} onClick={onClick} />
				))}
			</div>
		</div>
	);
}
