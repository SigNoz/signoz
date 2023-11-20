import RouteTab from 'components/RouteTab';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

import { alertsRoutesConfig } from './config';

function SettingsPage(): JSX.Element {
	const { pathname } = useLocation();

	return (
		<RouteTab
			history={history}
			routes={alertsRoutesConfig}
			activeKey={pathname}
		/>
	);
}

export default SettingsPage;
