import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import history from 'lib/history';
import React from 'react';
import { useTranslation } from 'react-i18next';

function AllAlertChannels(): JSX.Element {
	const pathName = history.location.pathname;
	const { t } = useTranslation();
	return (
		<RouteTab
			{...{
				routes: [
					{
						Component: GeneralSettings,
						name: t('routes.general'),
						route: ROUTES.SETTINGS,
					},
					{
						Component: AlertChannels,
						name: t('routes.alert_channels'),
						route: ROUTES.ALL_CHANNELS,
					},
				],
				activeKey:
					pathName === ROUTES.SETTINGS
						? t('routes.general')
						: t('routes.alert_channels'),
			}}
		/>
	);
}

export default AllAlertChannels;
