import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import RouteTab from 'components/RouteTab';
import history from 'lib/history';

import { getLogsSettingsRoute } from './config';

import './LogsSettings.styles.scss';

function LogsSettings(): JSX.Element {
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const routes = useMemo(() => getLogsSettingsRoute(t), [t]);

	return (
		<div className="logs-settings-container">
			<RouteTab activeKey={pathname} routes={routes} history={history} />
		</div>
	);
}

export default LogsSettings;
