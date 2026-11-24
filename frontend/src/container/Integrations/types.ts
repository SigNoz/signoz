import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { AWSCloudAccountConfig } from './CloudIntegration/AmazonWebServices/types';

export enum IntegrationType {
	AWS_SERVICES = 'aws',
	AZURE_SERVICES = 'azure',
	GCP_SERVICES = 'gcp',
}

interface IConfigConnectionStatus {
	category: string;
	category_display_name: string;
	last_received_ts_ms: number;
	last_received_from: string;
}

export interface IServiceStatus {
	logs: IConfigConnectionStatus[] | null;
	metrics: IConfigConnectionStatus[] | null;
}

export interface CloudAccount {
	id: string;
	cloud_account_id: string;
	config:
		| AzureCloudAccountConfig
		| AWSCloudAccountConfig
		| GCPCloudAccountConfig;
	status: AccountStatus | IServiceStatus;
	providerAccountId: string;
}

interface AzureCloudAccountConfig {
	deployment_region: string;
	resource_groups: string[];
}

export interface GCPCloudAccountConfig {
	connection_method: CloudintegrationtypesGCPConnectionMethodDTO;
	deployment_region: string;
	deployment_project_id: string;
	project_ids: string[];
}

interface AccountStatus {
	integration: IntegrationStatus;
}

interface IntegrationStatus {
	last_heartbeat_ts_ms: number;
}

export interface AzureRegion {
	label: string;
	geography: string;
	value: string;
}

export interface GCPRegion {
	label: string;
	geography: string;
	value: string;
}
