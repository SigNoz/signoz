import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

const removeAwsIntegrationAccount = async (
	accountId: string,
): Promise<SuccessResponse<Record<string, never>> | ErrorResponse> => {
	const response = await axios.post(
		`/cloud-integrations/aws/accounts/${accountId}/disconnect`,
	);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default removeAwsIntegrationAccount;
