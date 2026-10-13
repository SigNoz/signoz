import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';

import { Explorer } from './constants';

import './ApiMonitoringPage.styles.scss';

function ApiMonitoringPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Explorer];

	return (
		<RouteTab
			className="api-monitoring-page"
			routes={routes}
			activeKey={pathname}
			history={history}
		/>
	);
}

export default ApiMonitoringPage;
