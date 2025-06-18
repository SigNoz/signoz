import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import InfraMonitoringHosts from 'container/InfraMonitoringHosts';
import InfraMonitoringK8s from 'container/InfraMonitoringK8s';
import { Inbox } from 'lucide-react';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';

export const Hosts: TabRoutes = {
	Component: (): JSX.Element => (
		<PreferenceContextProvider>
			<InfraMonitoringHosts />
		</PreferenceContextProvider>
	),
	name: (
		<div className="tab-item">
			<Inbox size={16} /> Hosts
		</div>
	),
	route: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
	key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
};

export const Kubernetes: TabRoutes = {
	Component: (): JSX.Element => (
		<PreferenceContextProvider>
			<InfraMonitoringK8s />
		</PreferenceContextProvider>
	),
	name: (
		<div className="tab-item">
			<Inbox size={16} /> Kubernetes
		</div>
	),
	route: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
	key: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
};
