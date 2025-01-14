import { getAwsServices } from 'api/integrations/aws';
import { Service } from 'container/CloudIntegrationPage/ServicesSection/types';
import { useQuery, UseQueryResult } from 'react-query';

export const SERVICES_QUERY_KEY = ['aws-services'];

export function useGetAccountServices(
	accountId?: string,
): UseQueryResult<Service[]> {
	return useQuery([...SERVICES_QUERY_KEY, accountId], () =>
		getAwsServices(accountId),
	);
}
