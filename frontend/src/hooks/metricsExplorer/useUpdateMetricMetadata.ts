import { useMutation, UseMutationResult } from 'react-query';
import updateMetricMetadata, {
	UpdateMetricMetadataProps,
	UpdateMetricMetadataResponse,
} from 'api/metricsExplorer/updateMetricMetadata';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface UseUpdateMetricMetadataProps {
	metricName: string;
	payload: UpdateMetricMetadataProps;
}

export function useUpdateMetricMetadata(): UseMutationResult<
	SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse,
	Error,
	UseUpdateMetricMetadataProps
> {
	return useMutation<
		SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse,
		Error,
		UseUpdateMetricMetadataProps
	>({
		mutationFn: ({ metricName, payload }) =>
			updateMetricMetadata(metricName, payload),
	});
}
