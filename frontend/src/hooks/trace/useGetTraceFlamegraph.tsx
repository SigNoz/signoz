import { useQuery, UseQueryResult } from 'react-query';
import getTraceFlamegraph from 'api/trace/getTraceFlamegraph';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
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
		queryKey: [
			REACT_QUERY_KEY.GET_TRACE_V2_FLAMEGRAPH,
			props.traceId,
			props.selectFields,
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
