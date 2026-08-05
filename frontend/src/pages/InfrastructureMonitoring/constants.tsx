import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import InfraMonitoringHostsV2 from 'container/InfraMonitoringHostsV2';
import InfraMonitoringK8sV2 from 'container/InfraMonitoringK8sV2';
import { Inbox } from '@signozhq/icons';

function HostsContainer(): JSX.Element {
	return <InfraMonitoringHostsV2 />;
}

function KubernetesContainer(): JSX.Element {
	return <InfraMonitoringK8sV2 />;
}

export const Hosts: TabRoutes = {
	Component: HostsContainer,
	name: (
		<div className="tab-item">
			<Inbox size={16} /> Hosts
		</div>
	),
	route: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
	key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
};

export const Kubernetes: TabRoutes = {
	Component: KubernetesContainer,
	name: (
		<div className="tab-item">
			<Inbox size={16} /> Kubernetes
		</div>
	),
	route: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
	key: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
};
