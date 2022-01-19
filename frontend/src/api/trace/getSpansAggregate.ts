import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import convertObjectIntoParams from 'lib/query/convertObjectIntoParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpanAggregate';

const getSpanAggregate = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const preProps = {
			start: props.start,
			end: props.end,
			limit: props.limit,
			offset: props.offset,
		};

		const updatedQueryParams = `${convertObjectIntoParams(
			preProps,
		)}&${encodeURIComponent(
			convertObjectIntoParams(Object.fromEntries(props.selectedFilter), true),
		)}`;

		const response = await axios.get<PayloadProps>(
			`/getFilteredSpans?${updatedQueryParams}`,
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

export default getSpanAggregate;
