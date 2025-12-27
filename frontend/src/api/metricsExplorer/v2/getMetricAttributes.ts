import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	GetMetricAttributesRequest,
	GetMetricAttributesResponse,
} from 'types/api/metricsExplorer/v2';

export const getMetricAttributes = async (
	{ metricName, start, end }: GetMetricAttributesRequest,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponseV2<GetMetricAttributesResponse>> => {
	try {
		const encodedMetricName = encodeURIComponent(metricName);
		const response = await axios.post(
			'/metrics/attributes',
			{
				metricName: encodedMetricName,
				start,
				end,
			},
			{
				signal,
				headers,
			},
		);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
