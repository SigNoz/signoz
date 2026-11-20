import { useQuery, UseQueryResult } from 'react-query';
import getTraceV4 from 'api/trace/getTraceV4';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { TRACE_QUERY_STALE_TIME_MS } from './constants';
import {
	GetTraceV4PayloadProps,
	GetTraceV4SuccessResponse,
} from 'types/api/trace/getTraceV3';

type UseGetTraceV4Options = {
	/** Defaults to true; the query also needs a trace id. */
	enabled?: boolean;
};

const useGetTraceV4 = (
	props: GetTraceV4PayloadProps,
	{ enabled = true }: UseGetTraceV4Options = {},
): UseTraceV4 =>
	useQuery({
		queryFn: () => getTraceV4(props),
		queryKey: [
			REACT_QUERY_KEY.GET_TRACE_V4_WATERFALL,
			props.traceId,
			props.selectedSpanId,
			props.isSelectedSpanIDUnCollapsed,
		],
		enabled: enabled && !!props.traceId,
		keepPreviousData: true,
		refetchOnWindowFocus: false,
		staleTime: TRACE_QUERY_STALE_TIME_MS,
	});

type UseTraceV4 = UseQueryResult<
	SuccessResponse<GetTraceV4SuccessResponse> | ErrorResponse,
	unknown
>;

export default useGetTraceV4;
