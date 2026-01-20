import { GatewayApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

const deleteIngestionKey = async (
	id: string,
): Promise<SuccessResponse<void> | ErrorResponse> => {
	try {
		await GatewayApiV2Instance.delete(`/ingestion_keys/${id}`);

		return {
			statusCode: 200,
			error: null,
			message: 'success',
			payload: undefined,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default deleteIngestionKey;
