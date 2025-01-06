interface Service {
	id: string;
	title: string;
	icon: string;
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

interface ServiceStatus {
	logs: DataStatus | null;
	metrics: DataStatus | null;
}

interface ServiceData {
	id: string;
	title: string;
	icon: string;
	overview: string;
	assets: {
		dashboards: Dashboard[];
	};
	data_collected: {
		logs?: LogField[];
		metrics: Metric[];
	};
	config?: ServiceConfig; // Optional - included only with account_id
	status?: ServiceStatus; // Optional - included only with account_id
}

export type { Service, ServiceData };
