import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/dashboard/variables/query';

type PayloadVariables = Record<string, undefined | null | string | string[]>;

const query = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const variables: PayloadVariables = {};
		Object.entries(props.variables).forEach(([key, value]) => {
			variables[key] = value?.selectedValue;
		});
		const payload = {
			query: props.query,
			variables,
		};
		const response = await axios.post(`/variables/query`, payload);

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
