import axios from 'api';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';
import { toLegacyTagFilter } from 'utils/fieldContext';

export interface PipelineSimulationRequest {
	logs: ILog[];
	pipelines: PipelineData[];
}

export interface PipelineSimulationResponse {
	logs: ILog[];
}

const simulatePipelineProcessing = async (
	requestBody: PipelineSimulationRequest,
): Promise<PipelineSimulationResponse> =>
	axios
		.post('/logs/pipelines/preview', {
			...requestBody,
			pipelines: requestBody.pipelines.map((pipeline) => ({
				...pipeline,
				filter: toLegacyTagFilter(pipeline.filter),
			})),
		})
		.then((res) => res.data.data);

export default simulatePipelineProcessing;
