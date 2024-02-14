import { RouteTabProps } from 'components/RouteTab/types';
import { TFunction } from 'i18next';
import { isCloudUser } from 'utils/app';

import {
	alertChannels,
	generalSettings,
	ingestionSettings,
	organizationSettings,
} from './config';

export const getRoutes = (
	isCurrentOrgSettings: boolean,
	t: TFunction,
): RouteTabProps['routes'] => {
	const settings = [];

	if (isCurrentOrgSettings) {
		settings.push(...organizationSettings(t));
	}

	if (isCloudUser()) {
		settings.push(...ingestionSettings(t));
		settings.push(...alertChannels(t));
	} else {
		settings.push(...alertChannels(t));
		settings.push(...generalSettings(t));
	}

	settings.push(...generalSettings(t));

	return settings;
};
