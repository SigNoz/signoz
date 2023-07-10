import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import OrganizationSettings from 'container/OrganizationSettings';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

function SettingsPage(): JSX.Element {
	const pathName = history.location.pathname;
	const { t } = useTranslation(['routes']);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [currentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		role,
	);

	const getActiveKey = (pathname: string): string => {
		if (pathname === ROUTES.SETTINGS) {
			return t('general');
		}
		if (pathname === ROUTES.ORG_SETTINGS && currentOrgSettings) {
			return t('organization_settings');
		}
		return t('alert_channels');
	};

	const common = [
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
	];

	if (currentOrgSettings) {
		common.push({
			Component: OrganizationSettings,
			name: t('organization_settings'),
			route: ROUTES.ORG_SETTINGS,
		});
	}

	return (
		<RouteTab
			routes={common}
			activeKey={getActiveKey(pathName)}
			history={history}
		/>
	);
}

export default SettingsPage;
