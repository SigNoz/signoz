import getTraceV2 from 'api/trace/getTraceV2';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV2PayloadProps,
	GetTraceV2SuccessResponse,
} from 'types/api/trace/getTraceV2';

const useGetTraceV2 = (props: GetTraceV2PayloadProps): UseLicense =>
	useQuery({
		queryFn: () => getTraceV2(props),
		// if any of the props changes then we need to trigger an API call as the older data will be obsolete
		queryKey: [
			REACT_QUERY_KEY.GET_TRACE_V2_WATERFALL,
			props.traceId,
			props.selectedSpanId,
			props.isSelectedSpanIDUnCollapsed,
		],
		enabled: !!props.traceId,
		keepPreviousData: true,
		refetchOnWindowFocus: false,
	});

type UseLicense = UseQueryResult<
	SuccessResponse<GetTraceV2SuccessResponse> | ErrorResponse,
	unknown
>;

export default useGetTraceV2;
