import axios from 'api';
import { SaveViewPayloadProps, SaveViewProps } from 'types/api/saveViews/types';

export const saveView = async ({
	compositeQuery,
	sourcePage,
	viewName,
	extraData,
}: SaveViewProps): Promise<SaveViewPayloadProps> =>
	axios.post('explorer/views', {
		name: viewName,
		sourcePage,
		compositeQuery,
		extraData,
	});
