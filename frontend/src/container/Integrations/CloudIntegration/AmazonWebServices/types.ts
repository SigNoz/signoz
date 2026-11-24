export interface AWSCloudAccountConfig {
	regions: string[];
}

interface IntegrationStatus {
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
	providerAccountId: string;
}

export type { CloudAccount };
