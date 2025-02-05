import { getConnectionParams } from 'api/integrations/aws';
import { AxiosError } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { ConnectionParams } from 'types/api/integrations/aws';

export function useConnectionParams(): UseQueryResult<
	ConnectionParams,
	AxiosError
> {
	return useQuery<ConnectionParams, AxiosError>(
		['connectionParams'],
		getConnectionParams,
	);
}
