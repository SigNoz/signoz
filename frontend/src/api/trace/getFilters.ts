import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import omitBy from 'lodash-es/omitBy';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getFilters';

const getFilters = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const duration =
			omitBy(props.other, (_, key) => !key.startsWith('duration')) || [];

		const nonDuration = omitBy(props.other, (_, key) =>
			key.startsWith('duration'),
		);

		const exclude: string[] = [];

		props.isFilterExclude.forEach((value, key) => {
			if (value) {
				exclude.push(key);
			}
		});

		const response = await axios.post<PayloadProps>(`/getSpanFilters`, {
			start: props.start,
			end: props.end,
			getFilters: props.getFilters,
			...nonDuration,
			maxDuration: String((duration.duration || [])[0] || ''),
			minDuration: String((duration.duration || [])[1] || ''),
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

export default getFilters;
