import { getWaterfallV4 } from 'api/generated/services/tracedetail';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV4PayloadProps,
	GetTraceV4SuccessResponse,
	SpanV3,
} from 'types/api/trace/getTraceV3';

const getTraceV4 = async (
	props: GetTraceV4PayloadProps,
): Promise<SuccessResponse<GetTraceV4SuccessResponse> | ErrorResponse> => {
	let uncollapsedSpans = [...props.uncollapsedSpans];
	if (!props.isSelectedSpanIDUnCollapsed) {
		uncollapsedSpans = uncollapsedSpans.filter(
			(node) => node !== props.selectedSpanId,
		);
	} else if (
		props.selectedSpanId &&
		!uncollapsedSpans.includes(props.selectedSpanId)
	) {
		// Backend only uses the uncollapsedSpans list (unlike V2 which also interprets
		// isSelectedSpanIDUnCollapsed server-side), so explicitly add the selected span
		uncollapsedSpans.push(props.selectedSpanId);
	}
	const response = await getWaterfallV4(
		{ traceID: props.traceId },
		{
			selectedSpanId: props.selectedSpanId,
			uncollapsedSpans,
		},
	);

	// Generated client unwraps the axios response; .data is the waterfall payload.
	// Wire spans carry time_unix; SpanV3's timestamp + 'service.name' are derived below.
	type WireSpan = Omit<SpanV3, 'timestamp' | 'service.name'> & {
		time_unix: number;
	};
	const rawPayload = response.data as unknown as Omit<
		GetTraceV4SuccessResponse,
		'spans'
	> & { spans: WireSpan[] | null };

	// Derive 'service.name' from resource for convenience — only derived field
	const spans: SpanV3[] = (rawPayload.spans || []).map((span) => ({
		...span,
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
	}));

	// API returns startTimestampMillis/endTimestampMillis as relative durations (ms from epoch offset),
	// not absolute unix millis like V2. The span timestamps are absolute unix millis.
	// Convert by using the first span's timestamp as the base if there's a mismatch.
	let { startTimestampMillis, endTimestampMillis } = rawPayload;
	if (
		spans.length > 0 &&
		spans[0].timestamp > 0 &&
		startTimestampMillis < spans[0].timestamp / 10
	) {
		const durationMillis = endTimestampMillis - startTimestampMillis;
		startTimestampMillis = spans[0].timestamp;
		endTimestampMillis = startTimestampMillis + durationMillis;
	}

	return {
		statusCode: 200,
		error: null,
		message: 'Success',
		payload: {
			...rawPayload,
			spans,
			startTimestampMillis,
			endTimestampMillis,
		},
	};
};

export default getTraceV4;
