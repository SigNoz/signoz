import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { omit } from 'lodash-es';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetTraceFlamegraphPayloadProps,
	GetTraceFlamegraphSuccessResponse,
} from 'types/api/trace/getTraceFlamegraph';

const getTraceFlamegraph = async (
	props: GetTraceFlamegraphPayloadProps,
): Promise<
	SuccessResponse<GetTraceFlamegraphSuccessResponse> | ErrorResponse
> => {
	try {
		const response = await axios.post<GetTraceFlamegraphSuccessResponse>(
			`/traces/flamegraph/${props.traceId}`,
			omit(props, 'traceId'),
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

export default getTraceFlamegraph;
