import { ApiV3Instance as axios } from 'api';
import { omit } from 'lodash-es';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV3PayloadProps,
	GetTraceV3SuccessResponse,
} from 'types/api/trace/getTraceV3';

const getTraceV3 = async (
	props: GetTraceV3PayloadProps,
): Promise<SuccessResponse<GetTraceV3SuccessResponse> | ErrorResponse> => {
	let uncollapsedSpans = [...props.uncollapsedSpans];
	if (!props.isSelectedSpanIDUnCollapsed) {
		uncollapsedSpans = uncollapsedSpans.filter(
			(node) => node !== props.selectedSpanId,
		);
	}
	const postData: GetTraceV3PayloadProps = {
		...props,
		uncollapsedSpans,
	};
	const response = await axios.post<GetTraceV3SuccessResponse>(
		`/traces/${props.traceId}/waterfall`,
		omit(postData, 'traceId'),
	);

	// V3 API wraps response in { status, data }
	const rawPayload = (response.data as any).data || response.data;

	// Derive serviceName from resources for backward compatibility
	const spans = (rawPayload.spans || []).map((span: any) => ({
		...span,
		serviceName: span.serviceName || span.resources?.['service.name'] || '',
	}));

	return {
		statusCode: 200,
		error: null,
		message: 'Success',
		payload: { ...rawPayload, spans },
	};
};

export default getTraceV3;
