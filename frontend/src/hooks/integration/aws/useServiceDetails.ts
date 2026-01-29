import { useQuery, UseQueryResult } from 'react-query';
import { getServiceDetails } from 'api/integration/aws';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ServiceData } from 'container/CloudIntegrationPage/ServicesSection/types';

export function useServiceDetails(
	serviceId: string,
	cloudAccountId?: string,
): UseQueryResult<ServiceData> {
	return useQuery(
		[REACT_QUERY_KEY.AWS_SERVICE_DETAILS, serviceId, cloudAccountId],
		() => getServiceDetails(serviceId, cloudAccountId),
		{
			enabled: !!serviceId,
		},
	);
}
