import { useQuery, UseQueryResult } from 'react-query';
import { getCloudIntegrationAccounts } from 'api/integration';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { CloudAccount } from 'container/Integrations/CloudIntegration/AmazonWebServices/types';

export function useGetCloudIntegrationAccounts(
	cloudServiceId: string,
): UseQueryResult<CloudAccount[]> {
	return useQuery(
		[REACT_QUERY_KEY.CLOUD_INTEGRATION_ACCOUNTS, cloudServiceId],
		() => getCloudIntegrationAccounts(cloudServiceId),
	);
}
