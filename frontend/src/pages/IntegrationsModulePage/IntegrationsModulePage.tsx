import './IntegrationsModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-use';

import { installedIntegrations } from './constants';

function IntegrationsModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [installedIntegrations];
	return (
		<div className="integrations-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default IntegrationsModulePage;
