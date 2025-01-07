import { RouteTabProps } from 'components/RouteTab/types';
import { TFunction } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';
import { isCloudUser, isEECloudUser } from 'utils/app';

import {
	alertChannels,
	apiKeys,
	customDomainSettings,
	generalSettings,
	ingestionSettings,
	multiIngestionSettings,
	organizationSettings,
} from './config';

export const getRoutes = (
	userRole: ROLES | null,
	isCurrentOrgSettings: boolean,
	isGatewayEnabled: boolean,
	isWorkspaceBlocked: boolean,
	t: TFunction,
): RouteTabProps['routes'] => {
	const settings = [];

	const isCloudAccount = isCloudUser();
	const isEECloudAccount = isEECloudUser();

	const isAdmin = userRole === USER_ROLES.ADMIN;
	const isEditor = userRole === USER_ROLES.EDITOR;

	if (isWorkspaceBlocked && isAdmin) {
		settings.push(...organizationSettings(t));

		return settings;
	}

	settings.push(...generalSettings(t));

	if (isCurrentOrgSettings) {
		settings.push(...organizationSettings(t));
	}

	if (isGatewayEnabled && (isAdmin || isEditor)) {
		settings.push(...multiIngestionSettings(t));
	}

	if (isCloudAccount && !isGatewayEnabled) {
		settings.push(...ingestionSettings(t));
	}

	settings.push(...alertChannels(t));

	if ((isCloudAccount || isEECloudAccount) && isAdmin) {
		settings.push(...apiKeys(t));
	}

	if (isCloudAccount && isAdmin) {
		settings.push(...customDomainSettings(t));
	}

	return settings;
};
