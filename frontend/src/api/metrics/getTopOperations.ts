import { ApiV2Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import { PayloadProps, Props } from 'types/api/metrics/getTopOperations';

const getTopOperations = async (props: Props): Promise<PayloadProps> => {
	try {
		const endpoint = props.isEntryPoint
			? '/service/entry_point_operations'
			: '/service/top_operations';

		const response = await ApiV2Instance.post(endpoint, {
			start: `${props.start}`,
			end: `${props.end}`,
			service: props.service,
			tags: props.selectedTags,
			limit: 5000,
		});

		return response.data.data;
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getTopOperations;
