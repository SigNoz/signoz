import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import RouteTab from 'components/RouteTab';
import { useAppLocation } from 'lib/router/useAppLocation';
import { navigate } from 'lib/router/navigation';

import { getLogsSettingsRoute } from './config';

function LogsSettings(): JSX.Element {
	const { pathname } = useAppLocation();
	const { t } = useTranslation();

	const routes = useMemo(() => getLogsSettingsRoute(t), [t]);

	return (
		<RouteTab
			activeKey={pathname}
			routes={routes}
			history={{ push: navigate } as any}
		/>
	);
}

export default LogsSettings;
