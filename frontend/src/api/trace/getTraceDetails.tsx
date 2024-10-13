import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

interface GetTraceDetailsProps {
	traceId: string;
	interestedSpanId: string;
	uncollapsedNodes: string[];
}

interface GetTraceDetailsSuccessResponse {
	spans: any[];
}

const getTraceDetails = async (
	props: GetTraceDetailsProps,
): Promise<SuccessResponse<GetTraceDetailsSuccessResponse> | ErrorResponse> => {
	try {
		const response = await axios.post(`/traces/${props.traceId}`, {
			spanId: props.interestedSpanId,
			unCollapsedNodes: props.uncollapsedNodes,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getTraceDetails;
