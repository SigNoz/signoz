import { useMutation, useQueryClient } from 'react-query';
import deleteAtlassianConnection from 'api/channels/deleteAtlassianConnection';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { ATLASSIAN_CONNECTIONS_QUERY_KEY } from './useAtlassianConnections';

interface UseDeleteAtlassianConnectionResult {
	deleteConnection: (id: string) => Promise<unknown>;
	isDeleting: boolean;
}

export function useDeleteAtlassianConnection(): UseDeleteAtlassianConnectionResult {
	const queryClient = useQueryClient();
	const mutation = useMutation<SuccessResponseV2<null>, APIError, string>(
		(id: string) => deleteAtlassianConnection({ id }),
		{
			onSuccess: () => {
				void queryClient.invalidateQueries([ATLASSIAN_CONNECTIONS_QUERY_KEY]);
			},
		},
	);

	return {
		deleteConnection: mutation.mutateAsync,
		isDeleting: mutation.isLoading,
	};
}
