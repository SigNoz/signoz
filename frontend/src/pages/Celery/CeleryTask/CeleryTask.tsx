import './CeleryTask.styles.scss';

import CeleryTaskConfigOptions from 'components/CeleryTask/CeleryTaskConfigOptions/CeleryTaskConfigOptions';
import CeleryTaskDetail, {
	CeleryTaskData,
} from 'components/CeleryTask/CeleryTaskDetail/CeleryTaskDetail';
import CeleryTaskGraphGrid from 'components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphGrid';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { ListMinus } from 'lucide-react';
import { useState } from 'react';

export default function CeleryTask(): JSX.Element {
	const [task, setTask] = useState<CeleryTaskData | null>(null);

	const onTaskClick = (task: CeleryTaskData): void => {
		setTask(task);
	};

	return (
		<div className="celery-task-container">
			<div className="celery-task-breadcrumb">
				<ListMinus size={16} />
				Messaging Queues / Celery Task
			</div>
			<div className="celery-content">
				<div className="celery-content-header">
					<p className="celery-content-header-title">Celery Task</p>
					<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
				</div>
				<CeleryTaskConfigOptions />
				<CeleryTaskGraphGrid onClick={onTaskClick} />
			</div>
			<CeleryTaskDetail
				task={task}
				onClose={(): void => {
					setTask(null);
				}}
			/>
		</div>
	);
}
