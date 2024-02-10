import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import GeneralSettingsCloud from 'container/GeneralSettingsCloud';
import IngestionSettings from 'container/IngestionSettings/IngestionSettings';
import OrganizationSettings from 'container/OrganizationSettings';
import { TFunction } from 'i18next';

export const organizationSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: OrganizationSettings,
		name: t('routes:organization_settings').toString(),
		route: ROUTES.ORG_SETTINGS,
		key: ROUTES.ORG_SETTINGS,
	},
];

export const alertChannels = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: AlertChannels,
		name: t('routes:alert_channels').toString(),
		route: ROUTES.ALL_CHANNELS,
		key: ROUTES.ALL_CHANNELS,
	},
];

export const ingestionSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: IngestionSettings,
		name: t('routes:ingestion_settings').toString(),
		route: ROUTES.INGESTION_SETTINGS,
		key: ROUTES.INGESTION_SETTINGS,
	},
];

export const generalSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: GeneralSettings,
		name: t('routes:general').toString(),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
];

export const generalSettingsCloud = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: GeneralSettingsCloud,
		name: t('routes:general').toString(),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
];
