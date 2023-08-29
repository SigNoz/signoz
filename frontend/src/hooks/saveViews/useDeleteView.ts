import { deleteView } from 'api/saveView/deleteView';
import { useMutation, UseMutationResult } from 'react-query';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

export const useDeleteView = (
	uuid: string,
): UseMutationResult<DeleteViewPayloadProps, Error, string> =>
	useMutation({
		mutationKey: [uuid],
		mutationFn: () => deleteView(uuid),
	});
