import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { getConnectionParams } from 'api/integration';
import { AxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ConnectionParams } from 'types/api/integrations/types';

export function useGetConnectionParams({
	cloudServiceId,
	options,
}: {
	cloudServiceId: string;
	options?: UseQueryOptions<ConnectionParams, AxiosError>;
}): UseQueryResult<ConnectionParams, AxiosError> {
	return useQuery<ConnectionParams, AxiosError>(
		[REACT_QUERY_KEY.CLOUD_INTEGRATION_GET_CONNECTION_PARAMS],
		() => getConnectionParams(cloudServiceId),
		options,
	);
}
