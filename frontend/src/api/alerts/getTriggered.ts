import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import convertObjectIntoParams from 'lib/query/convertObjectIntoParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/alerts/getTriggered';

const getTriggered = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const queryParams = convertObjectIntoParams(props);

		const response = await axios.get(`/alerts?${queryParams}`);

		const amData = JSON.parse(response.data.data);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: amData.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getTriggered;
