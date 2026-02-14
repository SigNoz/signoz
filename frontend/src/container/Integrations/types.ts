import {
	AWSCloudAccountConfig,
	AWSServiceConfig,
} from './CloudIntegration/AmazonWebServices/types';

export enum IntegrationType {
	AWS_SERVICES = 'aws-services',
	AZURE_SERVICES = 'azure-services',
}

interface LogField {
	name: string;
	path: string;
	type: string;
}

interface Metric {
	name: string;
	type: string;
	unit: string;
}

export interface AzureConfig {
	name: string;
	enabled: boolean;
}

interface DataStatus {
	last_received_ts_ms: number;
	last_received_from: string;
}

export interface IServiceStatus {
	logs: DataStatus | null;
	metrics: DataStatus | null;
}

export interface AzureServicesConfig {
	logs: AzureConfig[];
	metrics: AzureConfig[];
}

interface Dashboard {
	id: string;
	url: string;
	title: string;
	description: string;
	image: string;
}

export interface SupportedSignals {
	metrics: boolean;
	logs: boolean;
}

export interface AzureService {
	id: string;
	title: string;
	icon: string;
	config: AzureServicesConfig;
}

export interface ServiceData {
	id: string;
	title: string;
	icon: string;
	overview: string;
	supported_signals: SupportedSignals;
	assets: {
		dashboards: Dashboard[];
	};
	data_collected: {
		logs?: LogField[];
		metrics: Metric[];
	};
	config?: AWSServiceConfig | AzureServicesConfig;
	status?: IServiceStatus;
}

export interface CloudAccount {
	id: string;
	cloud_account_id: string;
	config: AzureCloudAccountConfig | AWSCloudAccountConfig;
	status: AccountStatus | IServiceStatus;
}

export interface AzureCloudAccountConfig {
	deployment_region: string;
	resource_groups: string[];
}

export interface AccountStatus {
	integration: IntegrationStatus;
}

export interface IntegrationStatus {
	last_heartbeat_ts_ms: number;
}

export interface AzureRegion {
	label: string;
	geography: string;
	value: string;
}
