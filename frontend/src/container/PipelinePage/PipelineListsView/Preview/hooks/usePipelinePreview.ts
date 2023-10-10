import simulatePipelineProcessing from 'api/pipeline/preview';
import { useQuery } from 'react-query';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

import { LogsResponse } from '../types';

export interface PipelinePreviewRequest {
	pipeline: PipelineData;
	logs: ILog[];
}

const usePipelinePreview = ({
	pipeline,
	logs,
}: PipelinePreviewRequest): LogsResponse => {
	const { isFetching, isError, data } = useQuery({
		queryFn: async () =>
			simulatePipelineProcessing({
				logs,
				pipelines: [pipeline],
			}),
		queryKey: ['logs-pipeline-preview', pipeline, logs],
	});

	return {
		isLoading: isFetching,
		isError,
		logs: data?.payload?.logs || [],
	};
};

export default usePipelinePreview;
