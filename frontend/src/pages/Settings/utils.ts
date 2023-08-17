import { RouteTabProps } from 'components/RouteTab/types';
import { TFunction } from 'i18next';

import { commonRoutes, organizationSettings } from './config';

export const getRoutes = (
	isCurrentOrgSettings: boolean,
	t: TFunction,
): RouteTabProps['routes'] => {
	let common = commonRoutes(t);

	if (isCurrentOrgSettings) {
		common = [...common, ...organizationSettings(t)];
	}

	return common;
};
