import { useQuery } from 'react-query';
import getAtlassianConnections from 'api/channels/getAtlassianConnections';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { AtlassianConnection } from 'types/api/channels/atlassian';

export const ATLASSIAN_CONNECTIONS_QUERY_KEY = 'atlassianConnections';

interface UseAtlassianConnectionsResult {
	connections: AtlassianConnection[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => Promise<unknown>;
}

export function useAtlassianConnections(): UseAtlassianConnectionsResult {
	const query = useQuery<SuccessResponseV2<AtlassianConnection[]>, APIError>(
		[ATLASSIAN_CONNECTIONS_QUERY_KEY],
		() => getAtlassianConnections(),
	);

	return {
		connections: query.data?.data || [],
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	};
}
