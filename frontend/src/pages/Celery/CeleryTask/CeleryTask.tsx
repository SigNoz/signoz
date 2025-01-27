import './CeleryTask.styles.scss';

import CeleryTaskConfigOptions from 'components/CeleryTask/CeleryTaskConfigOptions/CeleryTaskConfigOptions';
import CeleryTaskDetail, {
	CaptureDataProps,
} from 'components/CeleryTask/CeleryTaskDetail/CeleryTaskDetail';
import CeleryTaskGraphGrid from 'components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphGrid';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useState } from 'react';

export default function CeleryTask(): JSX.Element {
	const [task, setTask] = useState<CaptureDataProps | null>(null);

	const onTaskClick = (captureData: CaptureDataProps): void => {
		setTask(captureData);
	};

	return (
		<div className="celery-task-container">
			<div className="celery-content">
				<div className="celery-content-header">
					<p className="celery-content-header-title">Celery Task</p>
					<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
				</div>
				<CeleryTaskConfigOptions />
				<CeleryTaskGraphGrid onClick={onTaskClick} queryEnabled={!task} />
			</div>
			{!!task && (
				<CeleryTaskDetail
					onClose={(): void => {
						setTask(null);
					}}
					widgetData={task.widgetData}
					taskData={task}
					drawerOpen={!!task}
				/>
			)}
		</div>
	);
}
