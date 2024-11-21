import './Settings.styles.scss';

import { Divider } from 'antd';
import { FeatureKeys } from 'constants/features';
import useComponentPermission from 'hooks/useComponentPermission';
import useFeatureFlag from 'hooks/useFeatureFlag';
import { Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import SettingsNavItems from './SettingsNavItems';
import { getRoutes } from './utils';

function SettingsPage(): JSX.Element {
	const { pathname } = useLocation();
	const history = useHistory();
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

	return (
		<div className="settings-page">
			<div className="settings-page-header">
				<Wrench size={14} /> Settings
			</div>
			<Divider style={{ margin: '0' }} />
			<div className="settings-page-content">
				<SettingsNavItems routes={routes} activeKey={pathname} history={history} />
			</div>
		</div>
	);
}

export default SettingsPage;
