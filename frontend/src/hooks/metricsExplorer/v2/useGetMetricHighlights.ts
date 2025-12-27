import { getMetricHighlights } from 'api/metricsExplorer/v2/getMetricHighlights';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { GetMetricHighlightsResponse } from 'types/api/metricsExplorer/v2';

type UseGetMetricHighlights = (
	metricName: string,
	options?: UseQueryOptions<
		SuccessResponseV2<GetMetricHighlightsResponse>,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<SuccessResponseV2<GetMetricHighlightsResponse>, Error>;

export const useGetMetricHighlights: UseGetMetricHighlights = (
	metricName,
	options,
	headers,
) =>
	useQuery<SuccessResponseV2<GetMetricHighlightsResponse>, Error>({
		queryFn: ({ signal }) => getMetricHighlights(metricName, signal, headers),
		...options,
		queryKey: [REACT_QUERY_KEY.GET_METRIC_HIGHLIGHTS, metricName],
	});
