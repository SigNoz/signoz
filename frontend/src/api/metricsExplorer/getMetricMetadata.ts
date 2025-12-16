import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

import { MetricDetails } from './getMetricDetails';

export interface MetricMetadataResponse {
	status: string;
	data: MetricDetails['metadata'];
}

export const getMetricMetadata = async (
	metricName: string,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponseV2<MetricMetadataResponse> | ErrorResponseV2> => {
	try {
		const response = await axios.get(
			`/metrics/metadata?metricName=${metricName}`,
			{
				signal,
				headers,
			},
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
