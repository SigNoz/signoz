import { CloudAccount } from 'container/Integrations/CloudIntegration/AmazonWebServices/types';

import { ConnectionParams } from './types';

export interface GenerateConnectionUrlPayload {
	agent_config: {
		region: string;
	} & ConnectionParams;
	account_config: {
		regions: string[];
	};
	account_id?: string;
}

export interface ConnectionUrlResponse {
	connection_url: string;
	account_id: string;
}

export interface AWSAccountConfigPayload {
	config: {
		regions: string[];
	};
}

export interface AccountConfigResponse {
	status: string;
	data: CloudAccount;
}
