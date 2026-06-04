import { useQuery, UseQueryResult } from 'react-query';
import {
	SpantypesSpanAggregationDTO,
	SpantypesSpanAggregationResultDTO,
} from 'api/generated/services/sigNoz.schemas';
import getTraceAggregations from 'api/trace/getTraceAggregations';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { SuccessResponseV2 } from 'types/api';

interface UseGetTraceAggregationsProps {
	traceId: string;
	aggregations: SpantypesSpanAggregationDTO[];
	enabled: boolean;
}

type UseGetTraceAggregations = UseQueryResult<
	SuccessResponseV2<SpantypesSpanAggregationResultDTO[]>
>;

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
		queryFn: () => getTraceAggregations({ traceId, aggregations }),
		queryKey: [REACT_QUERY_KEY.GET_TRACE_AGGREGATIONS, traceId, aggregations],
		enabled: enabled && !!traceId && aggregations.length > 0,
		refetchOnWindowFocus: false,
	});

export default useGetTraceAggregations;
