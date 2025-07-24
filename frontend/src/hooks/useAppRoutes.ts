import { AppRoutes } from 'AppRoutes/routes';
import routes from 'AppRoutes/routes';
import { getRoutes } from 'pages/Settings/utils';
import { useAppContext } from 'providers/App/App';
import { useMemo } from 'react';
import useComponentPermission from './useComponentPermission';
import { FeatureKeys } from 'constants/features';
import { useGetTenantLicense } from './useGetTenantLicense';

export const useAppRoutes = (): { routes: AppRoutes[] } => {
	const { user, featureFlags, trialInfo } = useAppContext();

	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		user.role,
	);

	const isGatewayEnabled =
		featureFlags?.find((feature) => feature.name === FeatureKeys.GATEWAY)
			?.active || false;

	const isWorkspaceBlocked = trialInfo?.workSpaceBlock || false;

	const tabRoutes = useMemo(
		() =>
			getRoutes(
				user.role,
				isCurrentOrgSettings,
				isGatewayEnabled,
				isWorkspaceBlocked,
				isCloudUser,
				isEnterpriseSelfHostedUser,
			),
		[
			user.role,
			isCurrentOrgSettings,
			isGatewayEnabled,
			isWorkspaceBlocked,
			isCloudUser,
			isEnterpriseSelfHostedUser,
		],
	);

	console.log({ tabRoutes });

	return { routes };
};
