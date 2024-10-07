import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import APIKeys from 'container/APIKeys/APIKeys';
import GeneralSettings from 'container/GeneralSettings';
import GeneralSettingsCloud from 'container/GeneralSettingsCloud';
import IngestionSettings from 'container/IngestionSettings/IngestionSettings';
import MultiIngestionSettings from 'container/IngestionSettings/MultiIngestionSettings';
import MySettings from 'container/MySettings';
import OrganizationSettings from 'container/OrganizationSettings';
import { TFunction } from 'i18next';

export const organizationSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: OrganizationSettings,
		name: (
			<div className="settings-menu-item">
				{t('routes:organization_settings').toString()}
			</div>
		),
		route: ROUTES.ORG_SETTINGS,
		key: ROUTES.ORG_SETTINGS,
	},
];

export const alertChannels = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: AlertChannels,
		name: (
			<div className="settings-menu-item">
				{t('routes:alert_channels').toString()}
			</div>
		),
		route: ROUTES.ALL_CHANNELS,
		key: ROUTES.ALL_CHANNELS,
	},
];

export const ingestionSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: IngestionSettings,
		name: (
			<div className="settings-menu-item">
				{t('routes:ingestion_settings').toString()}
			</div>
		),
		route: ROUTES.INGESTION_SETTINGS,
		key: ROUTES.INGESTION_SETTINGS,
	},
];

export const multiIngestionSettings = (
	t: TFunction,
): RouteTabProps['routes'] => [
	{
		Component: MultiIngestionSettings,
		name: (
			<div className="settings-menu-item">
				{t('routes:ingestion_settings').toString()}
			</div>
		),
		route: ROUTES.INGESTION_SETTINGS,
		key: ROUTES.INGESTION_SETTINGS,
	},
];

export const generalSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: GeneralSettings,
		name: (
			<div className="settings-menu-item">{t('routes:general').toString()}</div>
		),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
];

export const generalSettingsCloud = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: GeneralSettingsCloud,
		name: (
			<div className="settings-menu-item">{t('routes:general').toString()}</div>
		),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
];

export const apiKeys = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: APIKeys,
		name: (
			<div className="settings-menu-item">{t('routes:api_keys').toString()}</div>
		),
		route: ROUTES.API_KEYS,
		key: ROUTES.API_KEYS,
	},
];

export const userSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: MySettings,
		name: (
			<div className="settings-menu-item">
				{t('routes:user_settings').toString()}
			</div>
		),
		route: ROUTES.USER_SETTINGS,
		key: ROUTES.USER_SETTINGS,
	},
];
