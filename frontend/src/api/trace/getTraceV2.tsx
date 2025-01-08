import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { omit } from 'lodash-es';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceV2PayloadProps,
	GetTraceV2SuccessResponse,
} from 'types/api/trace/getTraceV2';

const getTraceV2 = async (
	props: GetTraceV2PayloadProps,
): Promise<SuccessResponse<GetTraceV2SuccessResponse> | ErrorResponse> => {
	try {
		let uncollapsedNodes = [...props.uncollapsedNodes];
		if (!props.isInterestedSpanIdUnCollapsed) {
			uncollapsedNodes = uncollapsedNodes.filter(
				(node) => node !== props.interestedSpanId,
			);
		}
		const postData: GetTraceV2PayloadProps = {
			...props,
			uncollapsedNodes,
		};
		const response = await axios.post<GetTraceV2SuccessResponse>(
			`/traces/${props.traceId}`,
			omit(postData, 'traceId'),
		);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getTraceV2;
