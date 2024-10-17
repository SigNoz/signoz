import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Inbox } from 'lucide-react';
import InfraMonitoringHosts from 'pages/InfraMonitoringHosts';

export const Hosts: TabRoutes = {
	Component: InfraMonitoringHosts,
	name: (
		<div className="tab-item">
			<Inbox size={16} /> Hosts
		</div>
	),
	route: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
	key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
};
