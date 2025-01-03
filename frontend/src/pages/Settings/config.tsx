import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import APIKeys from 'container/APIKeys/APIKeys';
import CustomDomainSettings from 'container/CustomDomainSettings';
import GeneralSettings from 'container/GeneralSettings';
import GeneralSettingsCloud from 'container/GeneralSettingsCloud';
import IngestionSettings from 'container/IngestionSettings/IngestionSettings';
import MultiIngestionSettings from 'container/IngestionSettings/MultiIngestionSettings';
import OrganizationSettings from 'container/OrganizationSettings';
import { TFunction } from 'i18next';
import {
	Backpack,
	BellDot,
	Building,
	Cpu,
	Globe,
	KeySquare,
} from 'lucide-react';

export const organizationSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: OrganizationSettings,
		name: (
			<div className="periscope-tab">
				<Building size={16} /> {t('routes:organization_settings').toString()}
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
			<div className="periscope-tab">
				<BellDot size={16} /> {t('routes:alert_channels').toString()}
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
			<div className="periscope-tab">
				<Cpu size={16} /> {t('routes:ingestion_settings').toString()}
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
			<div className="periscope-tab">
				<Cpu size={16} /> {t('routes:ingestion_settings').toString()}
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
			<div className="periscope-tab">
				<Backpack size={16} /> {t('routes:general').toString()}
			</div>
		),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
];

export const generalSettingsCloud = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: GeneralSettingsCloud,
		name: (
			<div className="periscope-tab">
				<Backpack size={16} /> {t('routes:general').toString()}
			</div>
		),
		route: ROUTES.SETTINGS,
		key: ROUTES.SETTINGS,
	},
];

export const apiKeys = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: APIKeys,
		name: (
			<div className="periscope-tab">
				<KeySquare size={16} /> {t('routes:api_keys').toString()}
			</div>
		),
		route: ROUTES.API_KEYS,
		key: ROUTES.API_KEYS,
	},
];

export const customDomainSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: CustomDomainSettings,
		name: (
			<div className="periscope-tab">
				<Globe size={16} /> {t('routes:custom_domain_settings').toString()}
			</div>
		),
		route: ROUTES.CUSTOM_DOMAIN_SETTINGS,
		key: ROUTES.CUSTOM_DOMAIN_SETTINGS,
	},
];
