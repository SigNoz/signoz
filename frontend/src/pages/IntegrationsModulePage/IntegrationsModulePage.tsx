import './IntegrationsModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import CloudIntegrationPage from 'container/CloudIntegrationPage/CloudIntegrationPage';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { INTEGRATION_TYPES } from 'pages/Integrations/utils';
import { useLocation } from 'react-use';

import { installedIntegrations } from './constants';

function IntegrationsModulePage(): JSX.Element {
	const { pathname } = useLocation();
	const urlQuery = useUrlQuery();
	const selectedIntegration = urlQuery.get('integration');

	const routes: TabRoutes[] = [installedIntegrations];
	return (
		<div className="integrations-module-container">
			{selectedIntegration === INTEGRATION_TYPES.AWS_INTEGRATION ? (
				<CloudIntegrationPage />
			) : (
				<RouteTab routes={routes} activeKey={pathname} history={history} />
			)}
		</div>
	);
}

export default IntegrationsModulePage;
