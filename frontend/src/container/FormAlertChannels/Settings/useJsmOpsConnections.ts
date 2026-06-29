import { useQuery } from 'react-query';
import getJsmOpsConnections from 'api/channels/getJsmOpsConnections';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { JsmOpsConnection } from 'types/api/channels/jsmOps';

const JSMOPS_CONNECTIONS_QUERY_KEY = 'jsmOpsConnections';

interface UseJsmOpsConnectionsResult {
	connections: JsmOpsConnection[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => Promise<unknown>;
}

export function useJsmOpsConnections(): UseJsmOpsConnectionsResult {
	const query = useQuery<SuccessResponseV2<JsmOpsConnection[]>, APIError>(
		[JSMOPS_CONNECTIONS_QUERY_KEY],
		() => getJsmOpsConnections(),
	);

	return {
		connections: query.data?.data || [],
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	};
}
