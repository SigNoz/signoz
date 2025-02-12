import { ApiV3Instance as axios } from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/licenses/getAll';

const getAll = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	const response = await axios.get('/licenses');

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default getAll;
