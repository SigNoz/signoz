import axios, { ApiV2Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import { PayloadProps, Props } from 'types/api/metrics/getTopOperations';

const getTopOperations = async (props: Props): Promise<PayloadProps> => {
	// Entry point operations - keep original implementation unchanged
	if (props.isEntryPoint) {
		const response = await axios.post('/service/entry_point_operations', {
			start: `${props.start}`,
			end: `${props.end}`,
			service: props.service,
			tags: props.selectedTags,
		});
		return response.data.data;
	}

	// Top operations - new v2 endpoint with error handling
	try {
		const response = await ApiV2Instance.post('/service/top_operations', {
			start: `${props.start}`,
			end: `${props.end}`,
			service: props.service,
			tags: props.selectedTags,
		});
		return response.data?.data ?? response.data;
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getTopOperations;
