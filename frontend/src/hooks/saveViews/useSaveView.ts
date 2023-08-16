import { saveView } from 'api/saveView/saveView';
import { useMutation, UseMutationResult } from 'react-query';
import { SaveViewPayloadProps, SaveViewProps } from 'types/api/saveViews/types';

export const useSaveView = ({
	compositeQuery,
	sourcePage,
	viewName,
	extraData,
}: SaveViewProps): UseMutationResult<
	SaveViewPayloadProps,
	Error,
	SaveViewProps
> =>
	useMutation({
		mutationKey: [viewName, sourcePage, compositeQuery, extraData],
		mutationFn: async () =>
			saveView({
				compositeQuery,
				sourcePage,
				viewName,
				extraData,
			}),
	});
