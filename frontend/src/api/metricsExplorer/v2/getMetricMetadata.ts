import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { MetricMetadataResponse } from 'types/api/metricsExplorer/v2/getMetricMetadata';

export const getMetricMetadata = async (
	metricName: string,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponseV2<MetricMetadataResponse> | ErrorResponseV2> => {
	try {
		const encodedMetricName = encodeURIComponent(metricName);
		const response = await axios.get(
			`/metrics/metadata?metricName=${encodedMetricName}`,
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
