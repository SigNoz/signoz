import './CeleryTask.styles.scss';

import logEvent from 'api/common/logEvent';
import CeleryTaskConfigOptions from 'components/CeleryTask/CeleryTaskConfigOptions/CeleryTaskConfigOptions';
import CeleryTaskDetail, {
	CaptureDataProps,
} from 'components/CeleryTask/CeleryTaskDetail/CeleryTaskDetail';
import CeleryTaskGraphGrid from 'components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphGrid';
import { QueryParams } from 'constants/query';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect, useRef, useState } from 'react';

export default function CeleryTask(): JSX.Element {
	const [task, setTask] = useState<CaptureDataProps | null>(null);
	const loggedRef = useRef(false);

	const taskName = useUrlQuery().get(QueryParams.taskName);

	useEffect(() => {
		if (taskName && !loggedRef.current) {
			logEvent('MQ Celery: Task name filter', {
				taskName,
			});
			loggedRef.current = true;
		}
	}, [taskName]);

	const onTaskClick = (captureData: CaptureDataProps): void => {
		setTask(captureData);
	};

	return (
		<div className="celery-task-container">
			<div className="celery-content">
				<div className="celery-content-header">
					<p className="celery-content-header-title">Celery</p>
					<div className="celery-content-header-right">
						<DateTimeSelectionV2 showAutoRefresh hideShareModal={false} />
					</div>
				</div>
				<CeleryTaskGraphGrid
					onClick={onTaskClick}
					queryEnabled={!task}
					configureOptionComponent={<CeleryTaskConfigOptions />}
				/>
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
