import { RouteTabProps } from 'components/RouteTab/types';
import { TFunction } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';

import {
	alertChannels,
	billingSettings,
	createAlertChannels,
	editAlertChannels,
	generalSettings,
	ingestionSettings,
	keyboardShortcuts,
	membersSettings,
	multiIngestionSettings,
	mySettings,
	organizationSettings,
	roleDetails,
	rolesSettings,
	serviceAccountsSettings,
} from './config';

export const getRoutes = (
	userRole: ROLES | null,
	isCurrentOrgSettings: boolean,
	isGatewayEnabled: boolean,
	isWorkspaceBlocked: boolean,
	isCloudUser: boolean,
	isEnterpriseSelfHostedUser: boolean,
	t: TFunction,
): RouteTabProps['routes'] => {
	const settings = [];

	const isAdmin = userRole === USER_ROLES.ADMIN;
	const isEditor = userRole === USER_ROLES.EDITOR;

	if (isWorkspaceBlocked && isAdmin) {
		settings.push(
			...organizationSettings(t),
			...membersSettings(t),
			...mySettings(t),
			...billingSettings(t),
			...keyboardShortcuts(t),
		);

		return settings;
	}

	settings.push(...generalSettings(t));

	if (isCurrentOrgSettings) {
		settings.push(...organizationSettings(t));
	}

	if (isGatewayEnabled && (isAdmin || isEditor)) {
		settings.push(...multiIngestionSettings(t));
	}

	if (isCloudUser && !isGatewayEnabled) {
		settings.push(...ingestionSettings(t));
	}

	settings.push(...alertChannels(t));

	if (isAdmin) {
		settings.push(...membersSettings(t), ...serviceAccountsSettings(t));
	}

	// todo: Sagar - check the condition for role list and details page, to whom we want to serve
	if ((isCloudUser || isEnterpriseSelfHostedUser) && isAdmin) {
		settings.push(...billingSettings(t), ...rolesSettings(t), ...roleDetails(t));
	}

	settings.push(
		...mySettings(t),
		...createAlertChannels(t),
		...editAlertChannels(t),
		...keyboardShortcuts(t),
	);

	return settings;
};
