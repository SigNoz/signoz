import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { navigate } from 'lib/router/navigation';

import { Explorer } from './constants';

import './ApiMonitoringPage.styles.scss';

function ApiMonitoringPage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [Explorer];

	return (
		<div className="api-monitoring-page">
			<RouteTab
				routes={routes}
				activeKey={pathname}
				history={{ push: navigate } as any}
			/>
		</div>
	);
}

export default ApiMonitoringPage;
