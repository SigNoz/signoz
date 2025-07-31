import ROUTES, { SETTINGS_NESTED_ROUTES } from 'constants/routes';
import { ROLES, USER_ROLES } from 'types/roles';

export const getRoutes = (
	userRole: ROLES | null,
	isCurrentOrgSettings: boolean,
	isGatewayEnabled: boolean,
	isWorkspaceBlocked: boolean,
	isCloudUser: boolean,
	isEnterpriseSelfHostedUser: boolean,
): string[] => {
	const settings = [];

	const isAdmin = userRole === USER_ROLES.ADMIN;
	const isEditor = userRole === USER_ROLES.EDITOR;

	if (isWorkspaceBlocked && isAdmin) {
		settings.push(
			SETTINGS_NESTED_ROUTES.ORG_SETTINGS,
			SETTINGS_NESTED_ROUTES.MY_SETTINGS,
			SETTINGS_NESTED_ROUTES.BILLING,
			SETTINGS_NESTED_ROUTES.SHORTCUTS,
		);

		return settings;
	}

	settings.push(ROUTES.SETTINGS);

	if (isCurrentOrgSettings) {
		settings.push(SETTINGS_NESTED_ROUTES.ORG_SETTINGS);
	}

	if (isGatewayEnabled && (isAdmin || isEditor)) {
		settings.push(SETTINGS_NESTED_ROUTES.INGESTION_SETTINGS);
	}

	if (isCloudUser && !isGatewayEnabled) {
		settings.push(SETTINGS_NESTED_ROUTES.INGESTION_SETTINGS);
	}

	settings.push(SETTINGS_NESTED_ROUTES.ALL_CHANNELS);

	if (isAdmin) {
		settings.push(SETTINGS_NESTED_ROUTES.API_KEYS);
	}

	if ((isCloudUser || isEnterpriseSelfHostedUser) && isAdmin) {
		settings.push(
			SETTINGS_NESTED_ROUTES.CUSTOM_DOMAIN_SETTINGS,
			SETTINGS_NESTED_ROUTES.BILLING,
		);
	}

	settings.push(
		SETTINGS_NESTED_ROUTES.MY_SETTINGS,
		SETTINGS_NESTED_ROUTES.CHANNELS_NEW,
		SETTINGS_NESTED_ROUTES.CHANNELS_EDIT,
		SETTINGS_NESTED_ROUTES.SHORTCUTS,
	);

	return settings;
};
