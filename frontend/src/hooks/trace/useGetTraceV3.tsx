import { useQuery, UseQueryResult } from 'react-query';
import getTraceV3 from 'api/trace/getTraceV3';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV3PayloadProps,
	GetTraceV3SuccessResponse,
} from 'types/api/trace/getTraceV3';

const useGetTraceV3 = (props: GetTraceV3PayloadProps): UseTraceV3 =>
	useQuery({
		queryFn: () => getTraceV3(props),
		queryKey: [
			REACT_QUERY_KEY.GET_TRACE_V3_WATERFALL,
			props.traceId,
			props.selectedSpanId,
			props.isSelectedSpanIDUnCollapsed,
			props.aggregations,
		],
		enabled: !!props.traceId,
		keepPreviousData: true,
		refetchOnWindowFocus: false,
	});

type UseTraceV3 = UseQueryResult<
	SuccessResponse<GetTraceV3SuccessResponse> | ErrorResponse,
	unknown
>;

export default useGetTraceV3;
