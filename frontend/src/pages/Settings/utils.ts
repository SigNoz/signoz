import { RouteTabProps } from 'components/RouteTab/types';
import { TFunction } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';

import {
	alertChannels,
	apiKeys,
	billingSettings,
	createAlertChannels,
	customDomainSettings,
	editAlertChannels,
	generalSettings,
	ingestionSettings,
	keyboardShortcuts,
	multiIngestionSettings,
	mySettings,
	organizationSettings,
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
		settings.push(...apiKeys(t));
	}

	if ((isCloudUser || isEnterpriseSelfHostedUser) && isAdmin) {
		settings.push(...customDomainSettings(t), ...billingSettings(t));
	}

	settings.push(
		...mySettings(t),
		...createAlertChannels(t),
		...editAlertChannels(t),
		...keyboardShortcuts(t),
	);

	return settings;
};
