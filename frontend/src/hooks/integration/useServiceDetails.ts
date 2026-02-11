import { useQuery, UseQueryResult } from 'react-query';
import { getCloudIntegrationServiceDetails } from 'api/integration';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ServiceData } from 'container/Integrations/CloudIntegration/AmazonWebServices/types';

export function useGetCloudIntegrationServiceDetails(
	cloudServiceId: string,
	serviceId: string,
	cloudAccountId?: string,
): UseQueryResult<ServiceData> {
	return useQuery(
		[REACT_QUERY_KEY.AWS_SERVICE_DETAILS, serviceId, cloudAccountId],
		() =>
			getCloudIntegrationServiceDetails(cloudServiceId, serviceId, cloudAccountId),
		{
			enabled: !!serviceId,
		},
	);
}
