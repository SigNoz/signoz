import ROUTES from 'constants/routes';
import CreateAlertChannels from 'container/CreateAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import { t } from 'i18next';

export const alertsRoutesConfig = [
	{
		Component: GeneralSettings,
		name: t('routes.general'),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
	{
		Component: (): JSX.Element => <CreateAlertChannels preType="slack" />,
		name: t('routes.alert_channels'),
		route: ROUTES.ALL_CHANNELS,
		key: ROUTES.ALL_CHANNELS,
	},
];
