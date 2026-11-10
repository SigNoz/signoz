import { useQuery, UseQueryResult } from 'react-query';
import {
	GetTraceAggregations200,
	SpantypesSpanAggregationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getTraceAggregations } from 'api/generated/services/tracedetail';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

interface UseGetTraceAggregationsProps {
	traceId: string;
	aggregations: SpantypesSpanAggregationDTO[];
	enabled: boolean;
}

type UseGetTraceAggregations = UseQueryResult<GetTraceAggregations200>;

/**
 * Fetches trace aggregations on demand — gate via `enabled` so the request
 * fires only when the Analytics panel is open. The query key includes the
 * requested fields, so changing the color-by field refetches.
 */
const useGetTraceAggregations = ({
	traceId,
	aggregations,
	enabled,
}: UseGetTraceAggregationsProps): UseGetTraceAggregations =>
	useQuery({
		queryFn: () => getTraceAggregations({ traceID: traceId }, { aggregations }),
		queryKey: [REACT_QUERY_KEY.GET_TRACE_AGGREGATIONS, traceId, aggregations],
		enabled: enabled && !!traceId && aggregations.length > 0,
		refetchOnWindowFocus: false,
	});

export default useGetTraceAggregations;
