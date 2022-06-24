import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	MetricNameProps,
	MetricNamesPayloadProps,
} from 'types/api/metrics/getMetricName';

export const getMetricName = async (
	props: MetricNameProps,
): Promise<SuccessResponse<MetricNamesPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/metrics/autocomplete/list?match=${props || ''}`,
		);

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
