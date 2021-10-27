import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpanAggregate';

const getSpansAggregate = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/spans/aggregates?start=${props.start}&end=${props.end}&aggregation_option=${props.aggregation_option}&dimension=${props.dimension}&kind=${props.kind}&maxDuration=${props.maxDuration}&minDuration=${props.minDuration}&operation=${props.operation}&service=${props.service}&step=${props.step}&tags=${props.tags}`,
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

export default getSpansAggregate;
