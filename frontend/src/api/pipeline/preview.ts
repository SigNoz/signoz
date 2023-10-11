import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

export interface PipelineSimulationRequest {
	logs: ILog[];
	pipelines: PipelineData[];
}

export interface PipelineSimulationResponse {
	logs: ILog[];
}

const simulatePipelineProcessing = async (
	requestBody: PipelineSimulationRequest,
): Promise<SuccessResponse<PipelineSimulationResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/logs/pipelines/preview', requestBody);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default simulatePipelineProcessing;
