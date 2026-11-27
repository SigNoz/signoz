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
		time_unix_nano?: string;
	};
	const rawPayload = response.data as unknown as Omit<
		GetTraceV4SuccessResponse,
		'spans'
	> & {
		spans: WireSpan[] | null;
		startTimestampUnixNano?: string;
		endTimestampUnixNano?: string;
	};

	// Derive 'service.name' from resource for convenience — only derived field
	// todo(tech-debt): to remove use of this and to directly use service.name from resources.
	const spans: SpanV3[] = (rawPayload.spans || []).map((span) => ({
		...span,
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix_nano
			? Number(span.time_unix_nano) / 1e6
			: span.time_unix,
	}));

	// Keep the trace origin as precise as the span timestamps.
	let { startTimestampMillis, endTimestampMillis } = rawPayload;
	if (rawPayload.startTimestampUnixNano) {
		startTimestampMillis = Number(rawPayload.startTimestampUnixNano) / 1e6;
	}
	if (rawPayload.endTimestampUnixNano) {
		endTimestampMillis = Number(rawPayload.endTimestampUnixNano) / 1e6;
	}
	// Older responses may use a relative origin for the trace bounds.
	if (
		!rawPayload.startTimestampUnixNano &&
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
