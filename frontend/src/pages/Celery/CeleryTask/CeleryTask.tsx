import { useEffect } from 'react';
import logEvent from 'api/common/logEvent';
import SystemDashboard from 'container/SystemDashboard/SystemDashboard';
import { createSystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';
import { EMBEDDED } from 'pages/DashboardPage/DashboardContainer/controls/presets';

const CELERY_TASKS = createSystemDashboardHost('celery-tasks', 'celery-tasks');

export default function CeleryTask(): JSX.Element {
	useEffect(() => {
		void logEvent('MQ Celery: Task view', {});
	}, []);

	return (
		<div data-testid="celery-task-page">
			<SystemDashboard host={CELERY_TASKS} controls={EMBEDDED} />
		</div>
	);
}
