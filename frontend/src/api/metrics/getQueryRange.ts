import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	TagValueProps,
	TagValuesPayloadProps,
} from 'types/api/metrics/getResourceAttributes';

export const getMetricsQueryRange = async (
	props: TagValueProps,
): Promise<SuccessResponse<TagValuesPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post(`/metrics/query_range`, props);

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
