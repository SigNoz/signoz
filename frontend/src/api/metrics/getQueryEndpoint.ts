import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Props, PayloadProps } from 'types/api/metrics/getQueryEndpoint';

const getQueryEndpoint = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/query_range?query=${props.query}&start=${props.start}&end=${props.end}&step=${props.step}`,
		);
		const payloadData = response.data;

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: payloadData.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getQueryEndpoint;
