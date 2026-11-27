import Loadable from 'components/Loadable';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { useAppLocation } from 'lib/router/useAppLocation';
import { ListMinus, Rows3 } from '@signozhq/icons';

import './MessagingQueuesMainPage.styles.scss';

const MessagingQueues = Loadable(() => import('./MessagingQueues'));

const MQDetailPage = Loadable(() => import('./MQDetailPage/MQDetailPage'));

const CeleryTask = Loadable(() => import('../Celery/CeleryTask/CeleryTask'));

const CeleryOverview = Loadable(
	() => import('pages/Celery/CeleryOverview/CeleryOverview'),
);

export const Kafka: TabRoutes = {
	Component: MessagingQueues,
	name: (
		<div className="tab-item">
			<ListMinus size={16} /> Kafka
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES_KAFKA,
	key: ROUTES.MESSAGING_QUEUES_KAFKA,
};

export const KafkaDetail: TabRoutes = {
	Component: MQDetailPage,
	name: (
		<div className="tab-item">
			<ListMinus size={16} /> Kafka
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL,
	key: ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL,
};

export const Celery: TabRoutes = {
	Component: CeleryTask,
	name: (
		<div className="tab-item">
			<Rows3 size={16} /> Celery
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
	key: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
};

export const Overview: TabRoutes = {
	Component: CeleryOverview,
	name: (
		<div className="tab-item">
			<Rows3 size={16} /> Overview
		</div>
	),
	route: ROUTES.MESSAGING_QUEUES_OVERVIEW,
	key: ROUTES.MESSAGING_QUEUES_OVERVIEW,
};

export default function MessagingQueuesMainPage(): JSX.Element {
	const { pathname } = useAppLocation();

	const isKafkaDetail = pathname === ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL;

	const routes: TabRoutes[] = [
		Overview,
		isKafkaDetail ? KafkaDetail : Kafka,
		Celery,
	];

	return (
		<RouteTab
			className="messaging-queues-module-container"
			routes={routes}
			activeKey={pathname}
		/>
	);
}
