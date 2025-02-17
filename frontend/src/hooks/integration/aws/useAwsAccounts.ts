import { getAwsAccounts } from 'api/integration/aws';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { CloudAccount } from 'container/CloudIntegrationPage/ServicesSection/types';
import { useQuery, UseQueryResult } from 'react-query';

export function useAwsAccounts(): UseQueryResult<CloudAccount[]> {
	return useQuery(REACT_QUERY_KEY.AWS_ACCOUNTS, getAwsAccounts);
}
