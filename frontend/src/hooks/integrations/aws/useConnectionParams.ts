import { getConnectionParams } from 'api/integrations/aws';
import { AxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ConnectionParams } from 'types/api/integrations/aws';

export function useConnectionParams(): UseQueryResult<
	ConnectionParams,
	AxiosError
> {
	return useQuery<ConnectionParams, AxiosError>(
		[REACT_QUERY_KEY.AWS_GET_CONNECTION_PARAMS],
		getConnectionParams,
	);
}
