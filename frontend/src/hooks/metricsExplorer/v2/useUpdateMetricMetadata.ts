import updateMetricMetadata from 'api/metricsExplorer/v2/updateMetricMetadata';
import { useMutation, UseMutationResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import {
	UpdateMetricMetadataResponse,
	UseUpdateMetricMetadataProps,
} from 'types/api/metricsExplorer/v2';

export function useUpdateMetricMetadata(): UseMutationResult<
	SuccessResponseV2<UpdateMetricMetadataResponse>,
	Error,
	UseUpdateMetricMetadataProps
> {
	return useMutation<
		SuccessResponseV2<UpdateMetricMetadataResponse>,
		Error,
		UseUpdateMetricMetadataProps
	>({
		mutationFn: ({ metricName, payload }) =>
			updateMetricMetadata(metricName, payload),
	});
}
