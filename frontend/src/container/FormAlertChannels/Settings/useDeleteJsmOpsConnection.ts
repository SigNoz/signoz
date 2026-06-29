import { useMutation, useQueryClient } from 'react-query';
import deleteJsmOpsConnection from 'api/channels/deleteJsmOpsConnection';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';

const JSMOPS_CONNECTIONS_QUERY_KEY = 'jsmOpsConnections';

interface UseDeleteJsmOpsConnectionResult {
	deleteConnection: (id: string) => Promise<unknown>;
	isDeleting: boolean;
}

export function useDeleteJsmOpsConnection(): UseDeleteJsmOpsConnectionResult {
	const queryClient = useQueryClient();
	const mutation = useMutation<SuccessResponseV2<null>, APIError, string>(
		(id: string) => deleteJsmOpsConnection({ id }),
		{
			onSuccess: () => {
				void queryClient.invalidateQueries([JSMOPS_CONNECTIONS_QUERY_KEY]);
			},
		},
	);

	return {
		deleteConnection: mutation.mutateAsync,
		isDeleting: mutation.isLoading,
	};
}
