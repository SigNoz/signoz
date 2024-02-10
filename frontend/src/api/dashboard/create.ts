import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/dashboard/create';

const createDashboard = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	const url = props.uploadedGrafana ? '/dashboards/grafana' : '/dashboards';
	try {
		const response = await axios.post(url, {
			...props,
		});

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

export default createDashboard;
