import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AllAPIKeyProps } from 'types/api/pat/types';

const deleteAPIKey = async (
	id: string,
): Promise<SuccessResponse<AllAPIKeyProps> | ErrorResponse> => {
	try {
		const response = await axios.delete(`/pats/${id}`);

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

export default deleteAPIKey;
