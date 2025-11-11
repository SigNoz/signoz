import { ApiV2Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import { PayloadProps, Props } from 'types/api/metrics/getService';

const getService = async (props: Props): Promise<PayloadProps> => {
	try {
		const response = await ApiV2Instance.post(`/services`, {
			start: `${props.start}`,
			end: `${props.end}`,
			tags: props.selectedTags,
		});
		return response.data.data;
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getService;
