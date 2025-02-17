import { getConnectionParams } from 'api/integration/aws';
import { AxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ConnectionParams } from 'types/api/integrations/aws';

export function useConnectionParams({
	options,
}: {
	options?: UseQueryOptions<ConnectionParams, AxiosError>;
}): UseQueryResult<ConnectionParams, AxiosError> {
	return useQuery<ConnectionParams, AxiosError>(
		[REACT_QUERY_KEY.AWS_GET_CONNECTION_PARAMS],
		getConnectionParams,
		options,
	);
}
