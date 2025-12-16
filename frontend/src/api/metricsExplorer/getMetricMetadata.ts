import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

import { Temporality } from './getMetricDetails';
import { MetricType } from './getMetricsList';

export interface MetricMetadata {
	description: string;
	type: MetricType;
	unit: string;
	temporality: Temporality;
	isMonotonic: boolean;
}

export interface MetricMetadataResponse {
	status: string;
	data: MetricMetadata;
}

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
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
