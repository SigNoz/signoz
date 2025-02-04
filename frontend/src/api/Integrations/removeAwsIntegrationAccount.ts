import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

const removeAwsIntegrationAccount = async (
	accountId: string,
): Promise<SuccessResponse<Record<string, never>> | ErrorResponse> => {
	try {
		const response = await axios.post(
			`/cloud-integrations/aws/accounts/${accountId}/disconnect`,
		);

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

export default removeAwsIntegrationAccount;
