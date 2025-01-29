import { ApiV2Instance as axios } from 'api';
import { omit } from 'lodash-es';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV2PayloadProps,
	GetTraceV2SuccessResponse,
} from 'types/api/trace/getTraceV2';

const getTraceV2 = async (
	props: GetTraceV2PayloadProps,
): Promise<SuccessResponse<GetTraceV2SuccessResponse> | ErrorResponse> => {
	let uncollapsedSpans = [...props.uncollapsedSpans];
	if (!props.isSelectedSpanIDUnCollapsed) {
		uncollapsedSpans = uncollapsedSpans.filter(
			(node) => node !== props.selectedSpanId,
		);
	}
	const postData: GetTraceV2PayloadProps = {
		...props,
		uncollapsedSpans,
	};
	const response = await axios.post<GetTraceV2SuccessResponse>(
		`/traces/waterfall/${props.traceId}`,
		omit(postData, 'traceId'),
	);

	return {
		statusCode: 200,
		error: null,
		message: 'Success',
		payload: response.data,
	};
};

export default getTraceV2;
