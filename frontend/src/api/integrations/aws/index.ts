import axios from 'api';
import {
	CloudAccount,
	Service,
	ServiceData,
<<<<<<< HEAD
} from 'container/CloudIntegrationPage/ServicesSection/types';
import {
	AccountConfigPayload,
	AccountConfigResponse,
	ConnectionUrlResponse,
} from 'types/api/integrations/aws';
=======
} from 'pages/Integrations/CloudIntegrationPage/ServicesSection/types';
<<<<<<< HEAD
import { ConnectionUrlResponse } from 'types/api/integrations/aws';
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
=======
import {
	AccountConfigPayload,
	AccountConfigResponse,
	ConnectionUrlResponse,
} from 'types/api/integrations/aws';
>>>>>>> b0fb28fc6 (feat: account settings)

export const getAwsAccounts = async (): Promise<CloudAccount[]> => {
	const response = await axios.get(
		'http://localhost:3000/api/v1/cloud-integrations/aws/accounts',
	);
<<<<<<< HEAD
<<<<<<< HEAD

	return response.data.data;
=======
	return response.data.data.accounts;
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
=======

	return response.data.data;
>>>>>>> bfef06ee7 (feat: get accounts from json-server API, and redirect Add new account to the integrations modal)
};

export const getAwsServices = async (
	accountId?: string,
): Promise<Service[]> => {
	const params = accountId ? { account_id: accountId } : undefined;
	const response = await axios.get(
		'http://localhost:3000/api/v1/cloud-integrations/aws/services',
		{
			params,
		},
	);
<<<<<<< HEAD
	return response.data.data;
=======
	return response.data.data.services;
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
};

export const getServiceDetails = async (
	serviceId: string,
	accountId?: string,
): Promise<ServiceData> => {
	const params = accountId ? { account_id: accountId } : undefined;
	const response = await axios.get(
		`http://localhost:3000/api/v1/cloud-integrations/aws/services/${serviceId}`,
		{ params },
	);
	return response.data.data;
};

export const generateConnectionUrl = async (params: {
	agent_config: { region: string };
	account_config: { regions: string[] };
	account_id?: string;
}): Promise<ConnectionUrlResponse> => {
	const response = await axios.post(
		'http://localhost:3000/api/v1/cloud-integrations/aws/accounts/generate-connection-url',
		params,
	);
	return response.data.data;
};
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> b0fb28fc6 (feat: account settings)

export const updateAccountConfig = async (
	accountId: string,
	payload: AccountConfigPayload,
): Promise<AccountConfigResponse> => {
	const response = await axios.put<AccountConfigResponse>(
		`http://localhost:3000/api/v1/cloud-integrations/aws/accounts/${accountId}/config`,
		payload,
	);
	return response.data;
};
<<<<<<< HEAD
=======
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
=======
>>>>>>> b0fb28fc6 (feat: account settings)
