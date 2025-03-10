import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { MetricType } from './getMetricsList';

export interface UpdateMetricMetadataProps {
	description: string;
	unit: string;
	type: MetricType;
}

export interface UpdateMetricMetadataResponse {
	success: boolean;
	message: string;
}

const updateMetricMetadata = async (
	metricName: string,
	props: UpdateMetricMetadataProps,
): Promise<SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse> => {
	const response = await axios.put(`/metrics/${metricName}/metadata`, {
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
