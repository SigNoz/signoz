import simulatePipelineProcessing from 'api/pipeline/preview';
import { useQuery } from 'react-query';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

export interface PipelinePreviewRequest {
	pipeline: PipelineData;
	inputLogs: ILog[];
}

export interface PipelinePreviewResponse {
	isLoading: boolean;
	outputLogs: ILog[];
	isError: boolean;
	errorMsg: string;
}

const usePipelinePreview = ({
	pipeline,
	inputLogs,
}: PipelinePreviewRequest): PipelinePreviewResponse => {
	// Ensure log timestamps are numbers for pipeline preview API request
	// ILog allows both number and string while the API needs a number
	const simulationReqLogs = inputLogs.map((l) => ({
		...l,
		timestamp: new Date(l.timestamp).getTime(),
	}));

	const response = useQuery({
		queryFn: async () =>
			simulatePipelineProcessing({
				logs: simulationReqLogs,
				pipelines: [pipeline],
			}),
		queryKey: ['logs-pipeline-preview', pipeline, inputLogs],
	});

	const { isFetching, data } = response;

	const errorMsg = data?.error || '';
	const isError = response.isError || Boolean(errorMsg);

	return {
		isLoading: isFetching,
		outputLogs: data?.payload?.logs || [],
		isError,
		errorMsg,
	};
};

export default usePipelinePreview;
