import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	TagKeyProps,
	TagKeysPayloadProps,
	TagValueProps,
	TagValuesPayloadProps,
} from 'types/api/metrics/getResourceAttributes';

export const getResourceAttributesTagValues = async (
	props: TagValueProps,
): Promise<SuccessResponse<TagValuesPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post(`/metrics/query_range`, {});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
