/* eslint-disable react/no-unstable-nested-components */
import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import CreateAlertChannels from 'container/CreateAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import history from 'lib/history';
import { useTranslation } from 'react-i18next';

function SettingsPage(): JSX.Element {
	const pathName = history.location.pathname;
	const { t } = useTranslation();
	return (
		<RouteTab
			history={history}
			{...{
				routes: [
					{
						Component: GeneralSettings,
						name: t('routes.general'),
						route: ROUTES.SETTINGS,
					},
					{
						Component: (): JSX.Element => <CreateAlertChannels preType="slack" />,
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

export default SettingsPage;
