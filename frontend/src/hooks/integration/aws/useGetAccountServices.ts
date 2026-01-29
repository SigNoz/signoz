import { useQuery, UseQueryResult } from 'react-query';
import { getAwsServices } from 'api/integration/aws';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Service } from 'container/CloudIntegrationPage/ServicesSection/types';

export function useGetAccountServices(
	accountId?: string,
): UseQueryResult<Service[]> {
	return useQuery([REACT_QUERY_KEY.AWS_SERVICES, accountId], () =>
		getAwsServices(accountId),
	);
}
