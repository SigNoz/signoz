import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import OrganizationSettings from 'container/OrganizationSettings';
import { TFunction } from 'i18next';

export const commonRoutes = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: GeneralSettings,
		name: t('routes:general').toString(),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
	{
		Component: AlertChannels,
		name: t('routes:alert_channels').toString(),
		route: ROUTES.ALL_CHANNELS,
		key: ROUTES.ALL_CHANNELS,
	},
];

export const organizationSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: OrganizationSettings,
		name: t('routes:organization_settings').toString(),
		route: ROUTES.ORG_SETTINGS,
		key: ROUTES.ORG_SETTINGS,
	},
];
