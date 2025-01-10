import { apiV1 } from 'api';
import axios, { AxiosError } from 'axios';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { AccountStatusResponse } from 'types/api/integrations/aws';

export function useAccountStatus(
	accountId: string | null,
	options: UseQueryOptions<AccountStatusResponse, AxiosError>,
): UseQueryResult<AccountStatusResponse, AxiosError> {
	return useQuery<AccountStatusResponse, AxiosError>({
		queryKey: ['accountStatus', accountId],
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
