import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import APIKeys from 'container/APIKeys/APIKeys';
import BillingContainer from 'container/BillingContainer/BillingContainer';
import CreateAlertChannels from 'container/CreateAlertChannels';
import { ChannelType } from 'container/CreateAlertChannels/config';
import CustomDomainSettings from 'container/CustomDomainSettings';
import GeneralSettings from 'container/GeneralSettings';
import GeneralSettingsCloud from 'container/GeneralSettingsCloud';
import IngestionSettings from 'container/IngestionSettings/IngestionSettings';
import MultiIngestionSettings from 'container/IngestionSettings/MultiIngestionSettings';
import MySettings from 'container/MySettings';
import OrganizationSettings from 'container/OrganizationSettings';
import { TFunction } from 'i18next';
import {
	Backpack,
	BellDot,
	Building,
	Cpu,
	CreditCard,
	Globe,
	Keyboard,
	KeySquare,
	Pencil,
	Plus,
	User,
} from 'lucide-react';
import ChannelsEdit from 'pages/ChannelsEdit';
import Shortcuts from 'pages/Shortcuts';

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

export const billingSettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: BillingContainer,
		name: (
			<div className="periscope-tab">
				<CreditCard size={16} /> {t('routes:billing').toString()}
			</div>
		),
		route: ROUTES.BILLING,
		key: ROUTES.BILLING,
	},
];

export const keyboardShortcuts = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: Shortcuts,
		name: (
			<div className="periscope-tab">
				<Keyboard size={16} /> {t('routes:shortcuts').toString()}
			</div>
		),
		route: ROUTES.SHORTCUTS,
		key: ROUTES.SHORTCUTS,
	},
];

export const mySettings = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: MySettings,
		name: (
			<div className="periscope-tab">
				<User size={16} /> {t('routes:my_settings').toString()}
			</div>
		),
		route: ROUTES.MY_SETTINGS,
		key: ROUTES.MY_SETTINGS,
	},
];

export const createAlertChannels = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: (): JSX.Element => (
			<CreateAlertChannels preType={ChannelType.Slack} />
		),
		name: (
			<div className="periscope-tab">
				<Plus size={16} /> {t('routes:create_alert_channels').toString()}
			</div>
		),
		route: ROUTES.CHANNELS_NEW,
		key: ROUTES.CHANNELS_NEW,
	},
];

export const editAlertChannels = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: ChannelsEdit,
		name: (
			<div className="periscope-tab">
				<Pencil size={16} /> {t('routes:edit_alert_channels').toString()}
			</div>
		),
		route: ROUTES.CHANNELS_EDIT,
		key: ROUTES.CHANNELS_EDIT,
	},
];
