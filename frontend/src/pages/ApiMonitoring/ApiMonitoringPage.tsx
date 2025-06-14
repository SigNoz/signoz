import './ApiMonitoringPage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-use';

import { Explorer } from './constants';

function ApiMonitoringPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Explorer];

	return (
		<div className="api-monitoring-page">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default ApiMonitoringPage;
