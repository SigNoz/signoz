import { AxiosAlertManagerInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/alerts/getGroups';

const getGroups = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const queryParams = Object.keys(props)
			.map((e) => `${e}=${props[e]}`)
			.join('&');

		const response = await AxiosAlertManagerInstance.get(
			`/alerts/groups?${queryParams}`,
		);

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

export default getGroups;
