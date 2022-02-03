import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Props, PayloadProps } from 'types/api/metrics/getRPS';

const getRPS = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const query = `sum(rate(signoz_latency_count{service_name="${props.service}", span_kind="SPAN_KIND_SERVER"}[2m]))`;
		const response = await axios.get(
			`/query_range?query=${query}&start=${props.start}&end=${props.end}&step=${props.step}`,
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

export default getRPS;
