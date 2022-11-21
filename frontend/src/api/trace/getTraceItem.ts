import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { formGetTraceItemUrlParams } from 'container/TraceDetail/utils';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetTraceItemProps, PayloadProps } from 'types/api/trace/getTraceItem';

const getTraceItem = async (
	props: GetTraceItemProps,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const paramsMap = new Map<string, string | null>([
			['spanId', props.spanId],
			['levelUp', props.levelUp],
			['levelDown', props.levelDown],
		]);
		const urlParams = formGetTraceItemUrlParams(paramsMap);
		const response = await axios.request<PayloadProps>({
			url: `/traces/${props.id}?${urlParams}`,
			method: 'get',
		});

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

export default getTraceItem;
