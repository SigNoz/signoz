import { useQuery } from 'react-query';
import simulatePipelineProcessing, {
	PipelineSimulationResponse,
} from 'api/pipeline/preview';
import { AxiosError } from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getBodyDisplay } from 'lib/logs/logBody';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

interface PipelinePreviewRequest {
	pipeline: PipelineData;
	inputLogs: ILog[];
}

interface PipelinePreviewResponse {
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
	const simulationInput = inputLogs.map((l) => ({
		...l,
		// log timestamps in query service API are unix nanos
		timestamp: new Date(l.timestamp).getTime() * 10 ** 6,
		// the preview API only accepts a string body
		body: getBodyDisplay(l.body),
	}));

	const response = useQuery<PipelineSimulationResponse, AxiosError>({
		queryFn: async () =>
			simulatePipelineProcessing({
				logs: simulationInput,
				pipelines: [pipeline],
			}),
		queryKey: [REACT_QUERY_KEY.LOGS_PIPELINE_PREVIEW, pipeline, inputLogs],
		retry: false,
	});

	const { isFetching, isError, data, error } = response;

	const outputLogs = (data?.logs || []).map((l: ILog) => ({
		...l,
		// log timestamps in query service API are unix nanos
		timestamp: (l.timestamp as number) / 10 ** 6,
	}));

	return {
		isLoading: isFetching,
		outputLogs,
		isError,
		errorMsg: error?.message || '',
	};
};

export default usePipelinePreview;
