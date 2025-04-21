import RouteTab from 'components/RouteTab';
import { useLocation } from 'react-router';

import { alertsRoutesConfig } from './config';

function SettingsPage(): JSX.Element {
	const { pathname } = useLocation();

	return <RouteTab routes={alertsRoutesConfig} activeKey={pathname} />;
}

export default SettingsPage;
