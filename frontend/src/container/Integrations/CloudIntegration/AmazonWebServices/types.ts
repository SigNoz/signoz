import { ServiceData } from 'container/Integrations/types';

interface Service {
	id: string;
	title: string;
	icon: string;
	config: AWSServiceConfig;
}

interface S3BucketsByRegion {
	[region: string]: string[];
}

interface ConfigStatus {
	enabled: boolean;
}

interface LogsConfig extends ConfigStatus {
	s3_buckets?: S3BucketsByRegion;
}

interface AWSServiceConfig {
	logs: LogsConfig;
	metrics: ConfigStatus;
	s3_sync?: LogsConfig;
}

interface ServiceDetailsResponse {
	status: 'success';
	data: ServiceData;
}

export interface AWSCloudAccountConfig {
	regions: string[];
}

export interface IntegrationStatus {
	last_heartbeat_ts_ms: number;
}

interface AccountStatus {
	integration: IntegrationStatus;
}

interface CloudAccount {
	id: string;
	cloud_account_id: string;
	config: AWSCloudAccountConfig;
	status: AccountStatus;
}

interface CloudAccountsData {
	accounts: CloudAccount[];
}

interface UpdateServiceConfigPayload {
	cloud_account_id: string;
	config: {
		logs: {
			enabled: boolean;
			s3_buckets?: S3BucketsByRegion;
		};
		metrics: {
			enabled: boolean;
		};
	};
}

interface UpdateServiceConfigResponse {
	status: string;
	data: {
		id: string;
		config: {
			logs: {
				enabled: boolean;
				s3_buckets?: S3BucketsByRegion;
			};
			metrics: {
				enabled: boolean;
			};
		};
	};
}

export type {
	AWSServiceConfig,
	CloudAccount,
	CloudAccountsData,
	S3BucketsByRegion,
	Service,
	ServiceData,
	ServiceDetailsResponse,
	UpdateServiceConfigPayload,
	UpdateServiceConfigResponse,
};
