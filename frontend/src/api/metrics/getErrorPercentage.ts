import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Props, PayloadProps } from 'types/api/metrics/getErrorPercentage';

const getErrorPercentage = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const query = `max(sum(rate(signoz_calls_total{service_name="${props.service}", span_kind="SPAN_KIND_SERVER", status_code="STATUS_CODE_ERROR"}[1m]) OR rate(signoz_calls_total{service_name="${props.service}", span_kind="SPAN_KIND_SERVER", http_status_code=~"5.."}[1m]))*100/sum(rate(signoz_calls_total{service_name="${props.service}", span_kind="SPAN_KIND_SERVER"}[1m]))) < 1000 OR vector(0)`;
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

export default getErrorPercentage;
