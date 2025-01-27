import './MessagingQueuesMainPage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { ListMinus, Rows3 } from 'lucide-react';
import CeleryOverview from 'pages/Celery/CeleryOverview/CeleryOverview';
import { useLocation } from 'react-use';

import CeleryTask from '../Celery/CeleryTask/CeleryTask';
import MessagingQueues from './MessagingQueues';

export const Kafka: TabRoutes = {
	Component: MessagingQueues,
	name: (
		<div className="tab-item">
			<ListMinus size={16} /> Kafka
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES,
	key: ROUTES.MESSAGING_QUEUES,
};

export const Celery: TabRoutes = {
	Component: CeleryTask,
	name: (
		<div className="tab-item">
			<Rows3 size={16} /> Celery Task
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
	key: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
};

export const Overview: TabRoutes = {
	Component: CeleryOverview,
	name: (
		<div className="tab-item">
			<Rows3 size={16} /> Celery Overview
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES_CELERY_OVERVIEW,
	key: ROUTES.MESSAGING_QUEUES_CELERY_OVERVIEW,
};

export default function MessagingQueuesMainPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Kafka, Celery, Overview];

	return (
		<div className="messaging-queues-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}
