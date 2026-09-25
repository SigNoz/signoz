import { useMutation, UseMutationResult, useQueryClient } from 'react-query';
import { invalidateListSavedViews } from 'api/generated/services/saved-view';
import { deleteView } from 'api/saveView/deleteView';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

export const useDeleteView = (
	uuid: string,
): UseMutationResult<DeleteViewPayloadProps, Error, string> => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: [uuid],
		mutationFn: () => deleteView(uuid),
		// v1 and v2 share storage; consumers already on v2 must see this write.
		// Temporary till the v1 client is deleted with the explorer bar.
		onSuccess: () => invalidateListSavedViews(queryClient),
	});
};
