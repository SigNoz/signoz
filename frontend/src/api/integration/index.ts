import axios from 'api';
import {
	CloudAccount,
	ServiceData,
} from 'container/Integrations/CloudIntegration/AmazonWebServices/types';
import {
	AzureCloudAccountConfig,
	AzureService,
	AzureServiceConfigPayload,
} from 'container/Integrations/types';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	AccountConfigResponse,
	AWSAccountConfigPayload,
} from 'types/api/integrations/aws';
import {
	AzureAccountConfig,
	ConnectionParams,
	IAzureDeploymentCommands,
} from 'types/api/integrations/types';

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

export const updateAccountConfig = async (
	cloudServiceId: string,
	accountId: string,
	payload: AWSAccountConfigPayload | AzureAccountConfig,
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
	payload: AzureServiceConfigPayload,
): Promise<AzureServiceConfigPayload> => {
	const response = await axios.post<AzureServiceConfigPayload>(
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

export const getAzureDeploymentCommands = async (params: {
	agent_config: ConnectionParams;
	account_config: AzureCloudAccountConfig;
}): Promise<IAzureDeploymentCommands> => {
	const response = await axios.post(
		`/cloud-integrations/azure/accounts/generate-connection-url`,
		params,
	);

	return response.data.data;
};

export const removeIntegrationAccount = async ({
	cloudServiceId,
	accountId,
}: {
	cloudServiceId: string;
	accountId: string;
}): Promise<SuccessResponse<Record<string, never>> | ErrorResponse> => {
	const response = await axios.post(
		`/cloud-integrations/${cloudServiceId}/accounts/${accountId}/disconnect`,
	);

	return response.data;
};
