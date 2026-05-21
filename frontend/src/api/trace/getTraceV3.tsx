import { ApiV3Instance as axios } from 'api';
import { omit } from 'lodash-es';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV3PayloadProps,
	GetTraceV3SuccessResponse,
	SpanV3,
} from 'types/api/trace/getTraceV3';

const getTraceV3 = async (
	props: GetTraceV3PayloadProps,
): Promise<SuccessResponse<GetTraceV3SuccessResponse> | ErrorResponse> => {
	let uncollapsedSpans = [...props.uncollapsedSpans];
	if (!props.isSelectedSpanIDUnCollapsed) {
		uncollapsedSpans = uncollapsedSpans.filter(
			(node) => node !== props.selectedSpanId,
		);
	} else if (
		props.selectedSpanId &&
		!uncollapsedSpans.includes(props.selectedSpanId)
	) {
		// V3 backend only uses uncollapsedSpans list (unlike V2 which also interprets
		// isSelectedSpanIDUnCollapsed server-side), so explicitly add the selected span
		uncollapsedSpans.push(props.selectedSpanId);
	}
	const postData: GetTraceV3PayloadProps = {
		...props,
		uncollapsedSpans,
		limit: 10000,
	};
	const response = await axios.post<GetTraceV3SuccessResponse>(
		`/traces/${props.traceId}/waterfall`,
		omit(postData, 'traceId'),
	);

	// V3 API wraps response in { status, data }
	const rawPayload = (response.data as any).data || response.data;

	// Derive 'service.name' from resource for convenience — only derived field
	const spans: SpanV3[] = (rawPayload.spans || []).map((span: any) => ({
		...span,
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
	}));

	// V3 API returns startTimestampMillis/endTimestampMillis as relative durations (ms from epoch offset),
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

export default getTraceV3;
