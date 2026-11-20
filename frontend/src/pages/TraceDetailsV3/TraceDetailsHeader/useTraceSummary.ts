import { useGetTraceSummary } from 'api/generated/services/tracedetail';
import type { SpantypesGettableTraceSummaryDTO } from 'api/generated/services/sigNoz.schemas';
import { TRACE_QUERY_STALE_TIME_MS } from 'hooks/trace/constants';

interface UseTraceSummaryResult {
	data: SpantypesGettableTraceSummaryDTO | undefined;
	isLoading: boolean;
}

export function useTraceSummary(traceId: string): UseTraceSummaryResult {
	const { data, isLoading } = useGetTraceSummary(
		{ traceID: traceId },
		{
			query: {
				enabled: !!traceId,
				keepPreviousData: true,
				staleTime: TRACE_QUERY_STALE_TIME_MS,
			},
		},
	);

	return { data: data?.data, isLoading };
}
