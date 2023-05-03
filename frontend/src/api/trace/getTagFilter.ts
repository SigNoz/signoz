import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getTagFilters';
import { TraceFilterEnum } from 'types/reducer/trace';

const getTagFilters = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const { duration, ...nonDuration } = props.other;

		const exclude: TraceFilterEnum[] = [];

		props.isFilterExclude.forEach((value, key) => {
			if (value) {
				exclude.push(key);
			}
		});

		const response = await axios.post<PayloadProps>(`/getTagFilters`, {
			start: String(props.start),
			end: String(props.end),
			...nonDuration,
			maxDuration: String((duration || [])[0] || ''),
			minDuration: String((duration || [])[1] || ''),
			exclude,
			spanKind: props.spanKind,
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

export default getTagFilters;
