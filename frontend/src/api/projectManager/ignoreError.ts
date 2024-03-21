import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
// import { PayloadProps, Props } from 'types/api/metrics/getExternalError';

const getAllProjectList = async (): // props: Props,
Promise<SuccessResponse<any> | ErrorResponse> => {
	try {
		const response = await axios.get(`/searchAllServices`);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getAllProjectList;
