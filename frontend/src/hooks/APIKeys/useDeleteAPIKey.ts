import { deleteView } from 'api/saveView/deleteView';
import { useMutation, UseMutationResult } from 'react-query';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

export const useDeleteAPIKey = (
	id: string,
): UseMutationResult<DeleteViewPayloadProps, Error, string> =>
	useMutation({
		mutationKey: [id],
		mutationFn: () => deleteView(id),
	});
