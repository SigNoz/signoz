import { getFlamegraph } from 'api/generated/services/tracedetail';
import {
	SpantypesGettableFlamegraphTraceDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export interface GetTraceFlamegraphV3Props {
	traceId: string;
	selectedSpanId?: string;
	selectFields?: TelemetryFieldKey[];
	enabled?: boolean;
}

const useGetTraceFlamegraphV3 = (
	props: GetTraceFlamegraphV3Props,
): UseQueryResult<SpantypesGettableFlamegraphTraceDTO, unknown> =>
	useQuery({
		queryFn: () =>
			getFlamegraph(
				{ traceID: props.traceId },
				{
					selectedSpanId: props.selectedSpanId,
					// v5 TelemetryFieldKey and the generated DTO are runtime-identical; only
					// the literal-union vs enum nominal types differ
					selectFields: props.selectFields as TelemetrytypesTelemetryFieldKeyDTO[],
				},
			).then((res) => res.data),
		queryKey: [
			REACT_QUERY_KEY.GET_TRACE_V3_FLAMEGRAPH,
			props.traceId,
			props.selectedSpanId,
			props.selectFields,
		],
		enabled: props.enabled,
		keepPreviousData: true,
		refetchOnWindowFocus: false,
	});

export default useGetTraceFlamegraphV3;
