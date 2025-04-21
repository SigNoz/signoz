import RouteTab from 'components/RouteTab';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { getLogsSettingsRoute } from './config';

function LogsSettings(): JSX.Element {
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const routes = useMemo(() => getLogsSettingsRoute(t), [t]);

	return <RouteTab activeKey={pathname} routes={routes} />;
}

export default LogsSettings;
