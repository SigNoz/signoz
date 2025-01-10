import { getAwsAccounts } from 'api/integrations/aws';
<<<<<<< HEAD
import { CloudAccount } from 'container/CloudIntegrationPage/ServicesSection/types';
=======
import { CloudAccount } from 'pages/Integrations/CloudIntegrationPage/ServicesSection/types';
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration)
import { useQuery, UseQueryResult } from 'react-query';

export const AWS_ACCOUNTS_QUERY_KEY = ['aws-accounts'];

export function useAwsAccounts(): UseQueryResult<CloudAccount[]> {
	return useQuery(AWS_ACCOUNTS_QUERY_KEY, getAwsAccounts);
}
