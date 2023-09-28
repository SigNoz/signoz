import { saveView } from 'api/saveView/saveView';
import { AxiosResponse } from 'axios';
import { useMutation, UseMutationResult } from 'react-query';
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
> =>
	useMutation({
		mutationKey: [viewName, sourcePage, compositeQuery, extraData],
		mutationFn: saveView,
	});
