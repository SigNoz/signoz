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
	isError: boolean;
	outputLogs: ILog[];
}

const usePipelinePreview = ({
	pipeline,
	inputLogs,
}: PipelinePreviewRequest): PipelinePreviewResponse => {
	const { isFetching, isError, data } = useQuery({
		queryFn: async () =>
			simulatePipelineProcessing({
				logs: inputLogs,
				pipelines: [pipeline],
			}),
		queryKey: ['logs-pipeline-preview', pipeline, inputLogs],
	});

	return {
		isLoading: isFetching,
		isError,
		outputLogs: data?.payload?.logs || [],
	};
};

export default usePipelinePreview;
