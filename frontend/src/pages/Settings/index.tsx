import RouteTab from 'components/RouteTab';
import { FeatureKeys } from 'constants/features';
import useComponentPermission from 'hooks/useComponentPermission';
import useFeatureFlag from 'hooks/useFeatureFlag';
import history from 'lib/history';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { getRoutes } from './utils';

function SettingsPage(): JSX.Element {
	const { pathname } = useLocation();
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		role,
	);
	const { t } = useTranslation(['routes']);

	const isGatewayEnabled = !!useFeatureFlag(FeatureKeys.GATEWAY)?.active;

	const routes = useMemo(
		() => getRoutes(role, isCurrentOrgSettings, isGatewayEnabled, t),
		[role, isCurrentOrgSettings, isGatewayEnabled, t],
	);

	return <RouteTab routes={routes} activeKey={pathname} history={history} />;
}

export default SettingsPage;
