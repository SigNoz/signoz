import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getTagValue';

const getTagValue = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	if (props.tagKey.Type === 'number') {
		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: {
				stringTagValues: [],
				numberTagValues: [],
				boolTagValues: [],
			},
		};
	}
	if (props.tagKey.Type === 'bool') {
		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: {
				stringTagValues: [],
				numberTagValues: [],
				boolTagValues: [true, false],
			},
		};
	}
	try {
		const response = await axios.post<PayloadProps>(`/getTagValues`, {
			start: props.start.toString(),
			end: props.end.toString(),
			tagKey: {
				Key: props.tagKey.Key,
				Type: props.tagKey.Type,
			},
		});
		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getTagValue;
