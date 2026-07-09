import { useMutation, useQueryClient } from 'react-query';
import deleteJiraConnection from 'api/channels/deleteJiraConnection';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';

import { JIRA_CONNECTIONS_QUERY_KEY } from './useJiraConnections';

interface UseDeleteJiraConnectionResult {
	deleteConnection: (id: string) => Promise<unknown>;
	isDeleting: boolean;
}

export function useDeleteJiraConnection(): UseDeleteJiraConnectionResult {
	const queryClient = useQueryClient();
	const mutation = useMutation<SuccessResponseV2<null>, APIError, string>(
		(id: string) => deleteJiraConnection({ id }),
		{
			onSuccess: () => {
				void queryClient.invalidateQueries([JIRA_CONNECTIONS_QUERY_KEY]);
			},
		},
	);

	return {
		deleteConnection: mutation.mutateAsync,
		isDeleting: mutation.isLoading,
	};
}
