import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import { TFunction } from 'i18next';
import { ROLES, USER_ROLES } from 'types/roles';
import { isCloudUser, isEECloudUser } from 'utils/app';

import {
	alertChannels,
	apiKeys,
	generalSettings,
	ingestionSettings,
	organizationSettings,
} from './config';

export const getRoutes = (
	userRole: ROLES | null,
	isCurrentOrgSettings: boolean,
	t: TFunction,
): RouteTabProps['routes'] => {
	const settings = [];
	// settings.push(...generalSettings(t));
	settings.push({
		Component: GeneralSettings,
		name: 'General',
		// name: `<div className="periscope-tab">
		// 		<Backpack size={16} /> {t('routes:general').toString()}
		// 	</div>`,
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	});
	console.log('getRoutes', settings);

	if (isCurrentOrgSettings) {
		settings.push(...organizationSettings(t));
	}

	// if (isCloudUser()) {
	// 	settings.push(...ingestionSettings(t));
	// 	settings.push(...alertChannels(t));
	// } else {
	// 	settings.push(...alertChannels(t));
	// }

	settings.push({
		Component: AlertChannels,
		name: 'Alert Channels',
		route: ROUTES.ALL_CHANNELS,
		key: ROUTES.ALL_CHANNELS,
	});

	if ((isCloudUser() || isEECloudUser()) && userRole === USER_ROLES.ADMIN) {
		settings.push(...apiKeys(t));
	}

	return settings;
};
