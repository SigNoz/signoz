import { QueryClient } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { toSpanV3 } from 'container/TracesExplorer/SpanDrawer/utils';
import { SuccessResponse } from 'types/api';
import { GetTraceV4SuccessResponse } from 'types/api/trace/getTraceV3';

import { getCachedFullWaterfallParams } from '../getCachedFullWaterfallParams';

function waterfallResponse(
	traceId: string,
	loaded: number,
	total: number,
): SuccessResponse<GetTraceV4SuccessResponse> {
	return {
		statusCode: 200,
		message: 'success',
		error: null,
		payload: {
			spans: Array.from({ length: loaded }, (_, i) =>
				toSpanV3({ id: `s${i}`, span_id: `s${i}`, trace_id: traceId }),
			),
			hasMissingSpans: false,
			uncollapsedSpans: [],
			startTimestampMillis: 0,
			endTimestampMillis: 1,
			totalSpansCount: total,
			totalErrorSpansCount: 0,
			rootServiceName: 'frontend',
			rootServiceEntryPoint: 'GET /',
		},
	};
}

describe('getCachedFullWaterfallParams', () => {
	it('returns the params of a cached response that holds every span', () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			[REACT_QUERY_KEY.GET_TRACE_V4_WATERFALL, 'trace-1', 'span-a', true],
			waterfallResponse('trace-1', 3, 3),
		);

		expect(getCachedFullWaterfallParams(queryClient, 'trace-1')).toStrictEqual({
			selectedSpanId: 'span-a',
			isSelectedSpanIDUnCollapsed: true,
			uncollapsedSpans: [],
		});
	});

	it('ignores a windowed response and other traces', () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			[REACT_QUERY_KEY.GET_TRACE_V4_WATERFALL, 'trace-1', 'span-a', true],
			waterfallResponse('trace-1', 2, 20_000),
		);
		queryClient.setQueryData(
			[REACT_QUERY_KEY.GET_TRACE_V4_WATERFALL, 'trace-2', 'span-b', true],
			waterfallResponse('trace-2', 3, 3),
		);

		expect(getCachedFullWaterfallParams(queryClient, 'trace-1')).toBeUndefined();
	});
});
