import axios from 'api';
import { AxiosResponse } from 'axios';
import { SaveViewPayloadProps, SaveViewProps } from 'types/api/saveViews/types';

export const saveView = ({
	compositeQuery,
	sourcePage,
	viewName,
	extraData,
}: SaveViewProps): Promise<AxiosResponse<SaveViewPayloadProps>> =>
	axios.post('/explorer/views', {
		name: viewName,
		sourcePage,
		compositeQuery,
		extraData,
	});
