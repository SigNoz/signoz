import { ApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceDetailsProps,
	GetTraceDetailsSuccessResponse,
} from 'types/api/trace/getTraceDetails';

const getTraceDetails = async (
	props: GetTraceDetailsProps,
): Promise<SuccessResponse<GetTraceDetailsSuccessResponse> | ErrorResponse> => {
	try {
		const response = await ApiV2Instance.post<GetTraceDetailsSuccessResponse>(
			`/traces/${props.traceID}`,
			{
				spanId: props.spanID,
				uncollapsedNodes: props.uncollapsedNodes,
			},
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

export default getTraceDetails;
