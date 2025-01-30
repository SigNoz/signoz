import axios from 'api';
import {
	CloudAccount,
	Service,
	ServiceData,
	UpdateServiceConfigPayload,
	UpdateServiceConfigResponse,
} from 'container/CloudIntegrationPage/ServicesSection/types';
import {
	AccountConfigPayload,
	AccountConfigResponse,
	ConnectionUrlResponse,
} from 'types/api/integrations/aws';

export const getAwsAccounts = async (): Promise<CloudAccount[]> => {
	const response = await axios.get('/cloud-integrations/aws/accounts');

	return response.data.data;
};

export const getAwsServices = async (
	accountId?: string,
): Promise<Service[]> => {
	const params = accountId ? { account_id: accountId } : undefined;
	const response = await axios.get('/cloud-integrations/aws/services', {
		params,
	});

	return response.data.data.services;
};

export const getServiceDetails = async (
	serviceId: string,
	accountId?: string,
): Promise<ServiceData> => {
	const params = accountId ? { account_id: accountId } : undefined;
	const response = await axios.get(
		`/cloud-integrations/aws/services/${serviceId}`,
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
		'/cloud-integrations/aws/accounts/generate-connection-url',
		params,
	);
	return response.data.data;
};

export const updateAccountConfig = async (
	accountId: string,
	payload: AccountConfigPayload,
): Promise<AccountConfigResponse> => {
	const response = await axios.post<AccountConfigResponse>(
		`/cloud-integrations/aws/accounts/${accountId}/config`,
		payload,
	);
	return response.data;
};

export const updateServiceConfig = async (
	serviceId: string,
	payload: UpdateServiceConfigPayload,
): Promise<UpdateServiceConfigResponse> => {
	const response = await axios.post<UpdateServiceConfigResponse>(
		`/cloud-integrations/aws/services/${serviceId}/config`,
		payload,
	);
	return response.data;
};
