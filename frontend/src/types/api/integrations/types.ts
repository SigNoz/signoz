interface IntegrationsProps {
	author: {
		email: string;
		homepage: string;
		name: string;
	};
	description: string;
	id: string;
	icon: string;
	is_installed: boolean;
	title: string;
}

export interface AllIntegrationsProps {
	status: string;
	data: IntegrationsProps[];
}

interface IntegrationDetailedProps {
	description: string;
	id: string;
	// check for the correct type here
	installation: null;
	title: string;
	author: {
		email: string;
		homepage: string;
		name: string;
	};
	icon: string;
	connection_status: {
		last_received_ts: number;
		last_received_from: string;
	};
	// check for the correct type here
	categories: string[];
	// check for the correct type here
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
	// check for the correct type heres
	data_collected: {
		logs: string[];
		metrics: string[];
	};
}
export interface GetIntegrationProps {
	data: IntegrationDetailedProps;
}

export interface GetIntegrationPayloadProps {
	integrationId: string;
}

export interface InstallIntegrationKeyProps {
	integrationId: string;
	// TODO exact object for config
	config: any;
}

export interface InstalledIntegrationsSuccessResponse {
	data: IntegrationsProps;
}

export interface UninstallIntegrationProps {
	integrationId: string;
}

export interface UninstallIntegrationSuccessResponse {
	data: any;
}
