import { useQuery } from 'react-query';
import getJiraConnections from 'api/channels/getJiraConnections';
import { SuccessResponseV2 } from 'types/api';
import { JiraConnection } from 'types/api/channels/jiraConnections';
import APIError from 'types/api/error';

export const JIRA_CONNECTIONS_QUERY_KEY = 'jiraConnections';

interface UseJiraConnectionsResult {
	connections: JiraConnection[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => Promise<unknown>;
}

export function useJiraConnections(): UseJiraConnectionsResult {
	const query = useQuery<SuccessResponseV2<JiraConnection[]>, APIError>(
		[JIRA_CONNECTIONS_QUERY_KEY],
		() => getJiraConnections(),
	);

	return {
		connections: query.data?.data || [],
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	};
}
