import { useMutation, UseMutationResult, useQueryClient } from 'react-query';
import { invalidateListSavedViews } from 'api/generated/services/saved-view';
import { updateView } from 'api/saveView/updateView';
import {
	UpdateViewPayloadProps,
	UpdateViewProps,
} from 'types/api/saveViews/types';

export const useUpdateView = ({
	compositeQuery,
	viewName,
	extraData,
	sourcePage,
	viewKey,
}: UpdateViewProps): UseMutationResult<
	UpdateViewPayloadProps,
	Error,
	UpdateViewProps,
	UpdateViewPayloadProps
> => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: [viewName, sourcePage, compositeQuery, extraData],
		mutationFn: () =>
			updateView({
				compositeQuery,
				viewName,
				extraData,
				sourcePage,
				viewKey,
			}),
		// v1 and v2 share storage; consumers already on v2 must see this write.
		// Temporary till the v1 client is deleted with the explorer bar.
		onSuccess: () => invalidateListSavedViews(queryClient),
	});
};
