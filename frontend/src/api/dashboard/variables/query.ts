import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/dashboard/variables/query';

const query = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		// const response = await new Promise((resolve) => {
		// 	resolve({
		// 		data: {
		// 			status: '',
		// 			data: {
		// 				variableValues: [
		// 					'2022-08-25T14:49:19.92605+05:30',
		// 					'2022-08-25T14:49:19.92615+05:30',
		// 					'2022-08-25T14:49:19.92625+05:30',
		// 				],
		// 			},
		// 		},
		// 	});
		// });
		// debugger
		const response = await axios.get(
			`/variables/query?query=${encodeURIComponent(props.query)}`,
		);
		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default query;
