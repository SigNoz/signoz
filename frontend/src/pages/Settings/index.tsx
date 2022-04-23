import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import OrganizationSettings from 'container/OrganizationSettings';
import history from 'lib/history';
import React from 'react';
import { useTranslation } from 'react-i18next';

function SettingsPage(): JSX.Element {
	const pathName = history.location.pathname;
	const { t } = useTranslation(['routes']);

	const getActiveKey = (pathname: string): string => {
		if (pathname === ROUTES.SETTINGS) {
			return t('general');
		}
		if (pathname === ROUTES.ORG_SETTINGS) {
			return t('organization_settings');
		}
		return t('alert_channels');
	};

	return (
		<RouteTab
			{...{
				routes: [
					{
						Component: GeneralSettings,
						name: t('general'),
						route: ROUTES.SETTINGS,
					},
					{
						Component: AlertChannels,
						name: t('alert_channels'),
						route: ROUTES.ALL_CHANNELS,
					},
					{
						Component: OrganizationSettings,
						name: t('organization_settings'),
						route: ROUTES.ORG_SETTINGS,
					},
				],
				activeKey: getActiveKey(pathName),
			}}
		/>
	);
}

export default SettingsPage;
