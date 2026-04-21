import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';
import { CloudAccount } from 'container/Integrations/CloudIntegration/AmazonWebServices/types';

export interface GenerateConnectionUrlPayload {
	agent_config: {
		region: string;
	} & CloudintegrationtypesCredentialsDTO;
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
