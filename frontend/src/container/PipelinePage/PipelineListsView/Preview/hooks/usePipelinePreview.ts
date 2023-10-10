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
	const response = useQuery({
		queryFn: async () =>
			simulatePipelineProcessing({
				logs: inputLogs,
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
