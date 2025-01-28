import { getServiceDetails } from 'api/integrations/aws';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ServiceData } from 'container/CloudIntegrationPage/ServicesSection/types';
import { useQuery, UseQueryResult } from 'react-query';

export function useServiceDetails(
	serviceId: string,
	accountId?: string,
): UseQueryResult<ServiceData> {
	return useQuery(
		[REACT_QUERY_KEY.AWS_SERVICE_DETAILS, serviceId, accountId],
		() => getServiceDetails(serviceId, accountId),
		{
			enabled: !!serviceId,
		},
	);
}
