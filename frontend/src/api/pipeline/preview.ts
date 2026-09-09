import axios from 'api';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

export interface PipelineSimulationRequest {
	logs: ILog[];
	pipelines: PipelineData[];
}

export interface PipelineSimulationResponse {
	logs: ILog[];
	// what the collector itself logged while simulating, e.g. an operator that
	// could not parse a log
	collectorLogs: string[];
}

const simulatePipelineProcessing = async (
	requestBody: PipelineSimulationRequest,
): Promise<PipelineSimulationResponse> =>
	axios
		.post('/logs/pipelines/preview', requestBody)
		.then((res) => res.data.data);

export default simulatePipelineProcessing;
