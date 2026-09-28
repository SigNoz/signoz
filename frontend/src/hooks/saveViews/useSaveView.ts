import { useMutation, UseMutationResult, useQueryClient } from 'react-query';
import { invalidateListSavedViews } from 'api/generated/services/saved-view';
import { saveView } from 'api/saveView/saveView';
import { AxiosResponse } from 'axios';
import { SaveViewPayloadProps, SaveViewProps } from 'types/api/saveViews/types';

export const useSaveView = ({
	compositeQuery,
	sourcePage,
	viewName,
	extraData,
}: SaveViewProps): UseMutationResult<
	AxiosResponse<SaveViewPayloadProps>,
	Error,
	SaveViewProps,
	SaveViewPayloadProps
> => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: [viewName, sourcePage, compositeQuery, extraData],
		mutationFn: saveView,
		// v1 and v2 share storage; consumers already on v2 must see this write.
		// Temporary till the v1 client is deleted with the explorer bar.
		onSuccess: () => invalidateListSavedViews(queryClient),
	});
};
