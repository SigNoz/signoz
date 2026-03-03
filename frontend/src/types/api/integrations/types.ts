export interface IntegrationsProps {
	author: {
		email: string;
		homepage: string;
		name: string;
	};
	description: string;
	id: string;
	icon: string;
	is_installed: boolean;
	is_new?: boolean;
	title: string;
}

export interface AllIntegrationsProps {
	status: string;
	data: {
		integrations: IntegrationsProps[];
	};
}

export interface AzureAccountConfig {
	config: {
		deployment_region: string;
		resource_groups: string[];
	};
}

export interface ConnectionParams {
	ingestion_url?: string;
	ingestion_key?: string;
	signoz_api_url?: string;
	signoz_api_key?: string;
}

export interface IntegrationDetailedProps {
	description: string;
	id: string;
	installation: {
		installed_at: string;
	} | null;
	title: string;
	author: {
		email: string;
		homepage: string;
		name: string;
	};
	icon: string;
	connection_status: {
		logs: {
			last_received_ts_ms: number;
			last_received_from: string;
		} | null;
		metrics: {
			last_received_ts_ms: number;
			last_received_from: string;
		} | null;
	};
	categories: string[];
	assets: {
		logs: {
			pipelines: [];
		};
		dashboards: [];
		alerts: [];
	};
	overview: string;
	configuration: [
		{
			title: string;
			instructions: string;
		},
	];
	data_collected: {
		logs: string[];
		metrics: string[];
	};
}
export interface GetIntegrationProps {
	data: IntegrationDetailedProps;
}

export interface IntegrationConnectionStatus {
	logs: {
		last_received_ts_ms: number;
		last_received_from: string;
	} | null;
	metrics: {
		last_received_ts_ms: number;
		last_received_from: string;
	} | null;
}

export interface GetIntegrationStatusProps {
	data: IntegrationConnectionStatus;
}

export interface GetIntegrationPayloadProps {
	integrationId: string;
	enabled?: boolean;
}

export interface InstallIntegrationKeyProps {
	integration_id: string;
	config: any;
}

export interface InstalledIntegrationsSuccessResponse {
	data: IntegrationsProps;
}

export interface UninstallIntegrationProps {
	integration_id: string;
}

export interface UninstallIntegrationSuccessResponse {
	data: any;
}

export interface IAzureDeploymentCommands {
	account_id: string;
	az_shell_connection_command: string;
	az_cli_connection_command: string;
}

export interface AccountStatusResponse {
	status: 'success';
	data: {
		id: string;
		cloud_account_id: string;
		status: {
			integration: {
				last_heartbeat_ts_ms: number | null;
			};
		};
	};
}
