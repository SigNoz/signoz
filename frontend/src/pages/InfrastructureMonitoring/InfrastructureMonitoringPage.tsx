import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';

import { Hosts, Kubernetes } from './constants';

import './InfrastructureMonitoring.styles.scss';

export default function InfrastructureMonitoringPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Hosts, Kubernetes];

	return (
		<div className="infra-monitoring-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}
