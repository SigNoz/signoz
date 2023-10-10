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

function numericTimestamp(timestamp: string | number): number {
	if (typeof timestamp === 'string') {
		return new Date(timestamp).getTime();
	}
	return timestamp;
}

const simulatePipelineProcessing = async (
	requestBody: PipelineSimulationRequest,
): Promise<SuccessResponse<PipelineSimulationResponse> | ErrorResponse> => {
	try {
		// Ensure ILog timestamps are numbers.
		// ILog allows both number and string while the API needs a number
		const payload = {
			...requestBody,
			logs: requestBody.logs.map((l) => ({
				...l,
				timestamp: numericTimestamp(l.timestamp),
			})),
		};

		const response = await axios.post('/logs/pipelines/preview', payload);

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
