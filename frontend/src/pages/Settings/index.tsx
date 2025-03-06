import RouteTab from 'components/RouteTab';
import { FeatureKeys } from 'constants/features';
import useComponentPermission from 'hooks/useComponentPermission';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { getRoutes } from './utils';

function SettingsPage(): JSX.Element {
	const { pathname } = useLocation();
	const { user, featureFlags, licenses } = useAppContext();
	const {
		isCloudUser: isCloudAccount,
		isEECloudUser: isEECloudAccount,
	} = useGetTenantLicense();

	const isWorkspaceBlocked = licenses?.workSpaceBlock || false;

	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		user.role,
	);
	const { t } = useTranslation(['routes']);

	const isGatewayEnabled =
		featureFlags?.find((feature) => feature.name === FeatureKeys.GATEWAY)
			?.active || false;

	const routes = useMemo(
		() =>
			getRoutes(
				user.role,
				isCurrentOrgSettings,
				isGatewayEnabled,
				isWorkspaceBlocked,
				isCloudAccount,
				isEECloudAccount,
				t,
			),
		[
			user.role,
			isCurrentOrgSettings,
			isGatewayEnabled,
			isWorkspaceBlocked,
			isCloudAccount,
			isEECloudAccount,
			t,
		],
	);

	return <RouteTab routes={routes} activeKey={pathname} history={history} />;
}

export default SettingsPage;
