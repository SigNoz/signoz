import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/quickFilters/getCustomFilters';

const getCustomFilters = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	const { signal } = props;
	try {
		const response = await ApiBaseInstance.get(`orgs/me/filters/${signal}`);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getCustomFilters;
