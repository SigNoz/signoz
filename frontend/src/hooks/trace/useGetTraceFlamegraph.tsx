import getTraceFlamegraph from 'api/trace/getTraceFlamegraph';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceFlamegraphPayloadProps,
	GetTraceFlamegraphSuccessResponse,
} from 'types/api/trace/getTraceFlamegraph';

const useGetTraceFlamegraph = (
	props: GetTraceFlamegraphPayloadProps,
): UseLicense =>
	useQuery({
		queryFn: () => getTraceFlamegraph(props),
		// if any of the props changes then we need to trigger an API call as the older data will be obsolete
		queryKey: [
			REACT_QUERY_KEY.GET_TRACE_V2_FLAMEGRAPH,
			props.traceId,
			props.selectedSpanId,
		],
		enabled: !!props.traceId,
		keepPreviousData: true,
		refetchOnWindowFocus: false,
	});

type UseLicense = UseQueryResult<
	SuccessResponse<GetTraceFlamegraphSuccessResponse> | ErrorResponse,
	unknown
>;

export default useGetTraceFlamegraph;
