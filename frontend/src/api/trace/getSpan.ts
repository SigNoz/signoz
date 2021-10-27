import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpans';

const getSpans = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/spans?&start=${props.start}&end=${props.end}&kind=${props.kind}&lookback=${props.lookback}&maxDuration=${props.maxDuration}&minDuration=${props.minDuration}&operation=${props.operation}&service=${props.service}&limit=${props.limit}&tags=${props.tags}`,
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

export default getSpans;
