import { getAwsAccounts } from 'api/integrations/aws';
import { CloudAccount } from 'container/CloudIntegrationPage/ServicesSection/types';
import { useQuery, UseQueryResult } from 'react-query';

export const AWS_ACCOUNTS_QUERY_KEY = ['aws-accounts'];

export function useAwsAccounts(): UseQueryResult<CloudAccount[]> {
	return useQuery(AWS_ACCOUNTS_QUERY_KEY, getAwsAccounts);
}
