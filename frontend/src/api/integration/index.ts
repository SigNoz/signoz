import axios from 'api';
import {
	CloudAccount,
	ServiceData,
	UpdateServiceConfigPayload,
	UpdateServiceConfigResponse,
} from 'container/Integrations/CloudIntegration/AmazonWebServices/types';
import { AzureService } from 'container/Integrations/types';
import {
	AccountConfigPayload,
	AccountConfigResponse,
	ConnectionParams,
	ConnectionUrlResponse,
} from 'types/api/integrations/aws';

export const getCloudIntegrationAccounts = async (
	cloudServiceId: string,
): Promise<CloudAccount[]> => {
	const response = await axios.get(
		`/cloud-integrations/${cloudServiceId}/accounts`,
	);

	return response.data.data.accounts;
};

export const getCloudIntegrationServices = async (
	cloudServiceId: string,
	cloudAccountId?: string,
): Promise<AzureService[]> => {
	const params = cloudAccountId
		? { cloud_account_id: cloudAccountId }
		: undefined;

	const response = await axios.get(
		`/cloud-integrations/${cloudServiceId}/services`,
		{
			params,
		},
	);

	return response.data.data.services;
};

export const getCloudIntegrationServiceDetails = async (
	cloudServiceId: string,
	serviceId: string,
	cloudAccountId?: string,
): Promise<ServiceData> => {
	const params = cloudAccountId
		? { cloud_account_id: cloudAccountId }
		: undefined;
	const response = await axios.get(
		`/cloud-integrations/${cloudServiceId}/services/${serviceId}`,
		{ params },
	);
	return response.data.data;
};

export const generateConnectionUrl = async (
	cloudServiceId: string,
	params: {
		agent_config: { region: string };
		account_config: { regions: string[] };
		account_id?: string;
	},
): Promise<ConnectionUrlResponse> => {
	const response = await axios.post(
		`/cloud-integrations/${cloudServiceId}/accounts/generate-connection-url`,
		params,
	);
	return response.data.data;
};

export const updateAccountConfig = async (
	cloudServiceId: string,
	accountId: string,
	payload: AccountConfigPayload,
): Promise<AccountConfigResponse> => {
	const response = await axios.post<AccountConfigResponse>(
		`/cloud-integrations/${cloudServiceId}/accounts/${accountId}/config`,
		payload,
	);
	return response.data;
};

export const updateServiceConfig = async (
	cloudServiceId: string,
	serviceId: string,
	payload: UpdateServiceConfigPayload,
): Promise<UpdateServiceConfigResponse> => {
	const response = await axios.post<UpdateServiceConfigResponse>(
		`/cloud-integrations/${cloudServiceId}/services/${serviceId}/config`,
		payload,
	);
	return response.data;
};

export const getConnectionParams = async (
	cloudServiceId: string,
): Promise<ConnectionParams> => {
	const response = await axios.get(
		`/cloud-integrations/${cloudServiceId}/accounts/generate-connection-params`,
	);
	return response.data.data;
};
