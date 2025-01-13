import { getServiceDetails } from 'api/integrations/aws';
import { ServiceData } from 'container/CloudIntegrationPage/ServicesSection/types';
import { useQuery, UseQueryResult } from 'react-query';

export const SERVICE_DETAILS_QUERY_KEY = ['aws-service-details'];

export function useServiceDetails(
	serviceId: string,
	accountId?: string,
): UseQueryResult<ServiceData> {
	return useQuery(
		[...SERVICE_DETAILS_QUERY_KEY, serviceId, accountId],
		() => getServiceDetails(serviceId, accountId),
		{
			enabled: !!serviceId,
		},
	);
}
