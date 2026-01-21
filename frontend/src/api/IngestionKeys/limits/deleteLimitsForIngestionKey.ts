import { ApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AllIngestionKeyProps } from 'types/api/ingestionKeys/types';

const deleteLimitsForIngestionKey = async (
	id: string,
): Promise<SuccessResponse<AllIngestionKeyProps> | ErrorResponse> => {
	try {
		const response = await ApiV2Instance.delete(
			`/gateway/ingestion_keys/limits/${id}`,
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

export default deleteLimitsForIngestionKey;
