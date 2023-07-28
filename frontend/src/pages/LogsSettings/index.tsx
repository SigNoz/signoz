import RouteTab from 'components/RouteTab';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

import { logsSettingsRoute, tabsExtraConfig } from './config';

function LogsSettings(): JSX.Element {
	const { pathname } = useLocation();
	const tabsConfig = tabsExtraConfig[pathname];

	return (
		<RouteTab
			activeKey={pathname}
			routes={logsSettingsRoute}
			history={history}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...tabsConfig}
		/>
	);
}

export default LogsSettings;
