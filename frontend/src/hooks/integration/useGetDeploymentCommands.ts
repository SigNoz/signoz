import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { getAzureDeploymentCommands } from 'api/integration';
import { AxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { AzureCloudAccountConfig } from 'container/Integrations/types';
import {
	ConnectionParams,
	IAzureDeploymentCommands,
} from 'types/api/integrations/types';

export function useGetDeploymentCommands({
	azureAccountConfig,
	connectionParams,
	options,
}: {
	azureAccountConfig: AzureCloudAccountConfig;
	connectionParams: ConnectionParams;
	options?: UseQueryOptions<IAzureDeploymentCommands, AxiosError>;
}): UseQueryResult<IAzureDeploymentCommands, AxiosError> {
	return useQuery<IAzureDeploymentCommands, AxiosError>(
		[REACT_QUERY_KEY.CLOUD_INTEGRATION_GET_DEPLOYMENT_COMMANDS],
		() =>
			getAzureDeploymentCommands({
				agent_config: connectionParams,
				account_config: azureAccountConfig,
			}),
		options,
	);
}
