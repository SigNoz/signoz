import { useGetTraceSummary } from 'api/generated/services/tracedetail';
import type { SpantypesGettableTraceSummaryDTO } from 'api/generated/services/sigNoz.schemas';

interface UseTraceSummaryResult {
	data: SpantypesGettableTraceSummaryDTO | undefined;
	isLoading: boolean;
}

export function useTraceSummary(traceId: string): UseTraceSummaryResult {
	const { data, isLoading } = useGetTraceSummary(
		{ traceID: traceId },
		{ query: { enabled: !!traceId, keepPreviousData: true } },
	);

	return { data: data?.data, isLoading };
}
