import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/alerts/get';

const get = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	const response = await axios.get(`/rules/${props.id}`);
	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};
export default get;
