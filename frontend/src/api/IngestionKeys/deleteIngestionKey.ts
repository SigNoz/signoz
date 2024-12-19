import { GatewayApiV1Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AllIngestionKeyProps } from 'types/api/ingestionKeys/types';

const deleteIngestionKey = async (
	id: string,
): Promise<SuccessResponse<AllIngestionKeyProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV1Instance.delete(
			`/workspaces/me/keys/${id}`,
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

export default deleteIngestionKey;
