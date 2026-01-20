import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { Temporality } from './getMetricDetails';
import { MetricType } from './getMetricsList';

export interface UpdateMetricMetadataProps {
	description: string;
	metricType: MetricType;
	temporality?: Temporality;
	isMonotonic?: boolean;
	unit?: string;
}

export interface UpdateMetricMetadataResponse {
	success: boolean;
	message: string;
}

const updateMetricMetadata = async (
	metricName: string,
	props: UpdateMetricMetadataProps,
): Promise<SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse> => {
	const response = await axios.post(`/metrics/${metricName}/metadata`, {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default updateMetricMetadata;
