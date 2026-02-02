import { useMutation, UseMutationResult } from 'react-query';
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
> =>
	useMutation({
		mutationKey: [viewName, sourcePage, compositeQuery, extraData],
		mutationFn: () =>
			updateView({
				compositeQuery,
				viewName,
				extraData,
				sourcePage,
				viewKey,
			}),
	});
