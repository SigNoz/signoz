import { apiV1 } from 'api';
import axios, { AxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { AccountStatusResponse } from 'types/api/integrations/aws';

export function useAccountStatus(
	accountId: string | undefined,
	options: UseQueryOptions<AccountStatusResponse, AxiosError>,
): UseQueryResult<AccountStatusResponse, AxiosError> {
	return useQuery<AccountStatusResponse, AxiosError>({
		queryKey: [REACT_QUERY_KEY.AWS_ACCOUNT_STATUS, accountId],
		queryFn: async () => {
			console.log('fetching account status');
			const response = await axios.get<AccountStatusResponse>(
				`http://localhost:3000${apiV1}cloud-integrations/aws/accounts/${accountId}/status`,
			);
			console.log('fetched account status', response.data);
			return response.data;
		},
		...options,
	});
}
