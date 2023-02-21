import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getTagValue';

const getTagValue = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post<PayloadProps>(`/getTagValues`, {
			start: props.start.toString(),
			end: props.end.toString(),
			tagKey: {
				Key: props.tagKey.Key,
				Type: props.tagKey.Type,
			},
			spanKind: props.spanKind,
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
