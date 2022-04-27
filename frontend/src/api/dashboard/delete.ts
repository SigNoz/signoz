import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Props } from 'types/api/dashboard/delete';

const deleteDashboard = async (
	props: Props,
): Promise<SuccessResponse<undefined> | ErrorResponse> => {
	try {
		const response = await axios.delete(`/dashboards/${props.uuid}`);

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

export default deleteDashboard;
