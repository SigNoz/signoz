interface Service {
	id: string;
	title: string;
	icon: string;
	config: ServiceConfig;
}

interface Dashboard {
	id: string;
	url: string;
	title: string;
	description: string;
	image: string;
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

interface ConfigStatus {
	enabled: boolean;
}

interface DataStatus {
	last_received_ts_ms: number;
	last_received_from: string;
}

interface ServiceConfig {
	logs: ConfigStatus;
	metrics: ConfigStatus;
}

interface IServiceStatus {
	logs: DataStatus | null;
	metrics: DataStatus | null;
}

interface SupportedSignals {
	metrics: boolean;
	logs: boolean;
}

interface ServiceData {
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
	config?: ServiceConfig;
	status?: IServiceStatus;
}

interface ServiceDetailsResponse {
	status: 'success';
	data: ServiceData;
}

interface CloudAccountConfig {
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
	config: CloudAccountConfig;
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
			};
			metrics: {
				enabled: boolean;
			};
		};
	};
}

export type {
	CloudAccount,
	CloudAccountsData,
	IServiceStatus,
	Service,
	ServiceConfig,
	ServiceData,
	ServiceDetailsResponse,
	SupportedSignals,
	UpdateServiceConfigPayload,
	UpdateServiceConfigResponse,
};
