import { RouteTabProps } from 'components/RouteTab/types';
import { TFunction } from 'i18next';
import { isCloudUser } from 'utils/app';

import {
	commonRoutes,
	ingestionSettings,
	organizationSettings,
} from './config';

export const getRoutes = (
	isCurrentOrgSettings: boolean,
	t: TFunction,
): RouteTabProps['routes'] => {
	let common = commonRoutes(t);

	if (isCurrentOrgSettings) {
		common = [...common, ...organizationSettings(t)];
	}

	if (isCloudUser()) {
		common = [...common, ...ingestionSettings(t)];
	}

	return common;
};
