import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	Props,
	VariableResponseProps,
} from 'types/api/dashboard/variables/query';

const dashboardVariablesQuery = async (
	props: Props,
): Promise<SuccessResponse<VariableResponseProps> | ErrorResponse> => {
	try {
		const response = await axios.post(`/variables/query`, props);

		console.log('response', response);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		console.log('API error', error);

		const formattedError = ErrorResponseHandler(error as AxiosError);

		console.log('formatted Error', formattedError);

		// return formattedError;

		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw { message: 'Error fetching data', details: formattedError };
	}
};

export default dashboardVariablesQuery;
