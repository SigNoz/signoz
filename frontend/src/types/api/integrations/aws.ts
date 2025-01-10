<<<<<<< HEAD
import { CloudAccount } from 'container/CloudIntegrationPage/ServicesSection/types';

=======
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
export interface GenerateConnectionUrlPayload {
	agent_config: {
		region: string;
	};
	account_config: {
		regions: string[];
	};
	account_id?: string;
}

export interface ConnectionUrlResponse {
	connection_url: string;
	account_id: string;
}

export interface AccountStatusResponse {
	status: 'success';
	data: {
		id: string;
		status: {
			integration: {
				last_heartbeat_ts_ms: number | null;
			};
		};
	};
}
<<<<<<< HEAD

export interface AccountConfigPayload {
	config: {
		regions: string[];
	};
}

export interface AccountConfigResponse {
	status: string;
	data: CloudAccount;
}
=======
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
