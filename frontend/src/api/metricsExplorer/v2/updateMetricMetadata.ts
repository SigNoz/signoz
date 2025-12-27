import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	UpdateMetricMetadataRequest,
	UpdateMetricMetadataResponse,
} from 'types/api/metricsExplorer/v2';

const updateMetricMetadata = async (
	metricName: string,
	props: UpdateMetricMetadataRequest,
): Promise<SuccessResponseV2<UpdateMetricMetadataResponse>> => {
	try {
		const response = await axios.post(`/metrics/${metricName}/metadata`, {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default updateMetricMetadata;
