import { useQuery, UseQueryResult } from 'react-query';
import { getCloudIntegrationServices } from 'api/integration';
import { AzureService } from 'container/Integrations/types';

export function useGetAccountServices(
	cloudServiceId: string,
	accountId?: string,
): UseQueryResult<AzureService[]> {
	return useQuery([cloudServiceId, accountId], () =>
		getCloudIntegrationServices(cloudServiceId, accountId),
	);
}
