import axios from 'api';
import { AxiosError } from 'axios';
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
			const response = await axios.get<AccountStatusResponse>(
				`/cloud-integrations/aws/accounts/${accountId}/status`,
			);
			return response.data;
		},
		...options,
	});
}
