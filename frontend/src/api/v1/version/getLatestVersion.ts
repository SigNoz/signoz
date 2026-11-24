import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import type { AxiosError } from 'axios';
import axios from 'axios';
import type { ErrorResponse, SuccessResponse } from 'types/api';
import type { PayloadProps } from 'types/api/user/getLatestVersion';

const getLatestVersion = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const response = await axios.get(
			`https://api.github.com/repos/signoz/signoz/releases/latest`,
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

export default getLatestVersion;
