import { QueryClient } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetTraceV4SuccessResponse } from 'types/api/trace/getTraceV3';

export type WaterfallQueryParams = {
	selectedSpanId: string;
	isSelectedSpanIDUnCollapsed: boolean;
	uncollapsedSpans: string[];
};

/** Params of a cached waterfall response that holds every span of `traceId`. */
export function getCachedFullWaterfallParams(
	queryClient: QueryClient,
	traceId: string,
): WaterfallQueryParams | undefined {
	const entries = queryClient.getQueriesData<
		SuccessResponse<GetTraceV4SuccessResponse> | ErrorResponse
	>([REACT_QUERY_KEY.GET_TRACE_V4_WATERFALL, traceId]);

	for (const [queryKey, data] of entries) {
		const payload = data?.payload;
		if (
			payload &&
			payload.totalSpansCount > 0 &&
			payload.spans.length >= payload.totalSpansCount
		) {
			const [, , selectedSpanId, isSelectedSpanIDUnCollapsed] = queryKey as [
				string,
				string,
				string,
				boolean,
			];
			return {
				selectedSpanId,
				isSelectedSpanIDUnCollapsed,
				uncollapsedSpans: [],
			};
		}
	}
	return undefined;
}
