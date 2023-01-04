import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/logs/getLogsAggregate';

const GetLogsAggregate = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const data = await axios.get(`/logs/aggregate`, {
			params: props,
		});

		return {
			statusCode: 200,
			error: null,
			message: '',
			payload: data.data.items,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default GetLogsAggregate;
