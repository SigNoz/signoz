import { ApiV2Instance as axios } from 'api';
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
};

export default getTraceFlamegraph;
