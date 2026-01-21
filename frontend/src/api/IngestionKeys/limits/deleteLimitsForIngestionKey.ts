import { GatewayApiV2Instance } from 'api';
import axios from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { ErrorStatusCode } from 'types/common';

const deleteLimitsForIngestionKey = async (
	id: string,
): Promise<SuccessResponse<void> | ErrorResponse> => {
	try {
		await GatewayApiV2Instance.delete(`/ingestion_keys/limits/${id}`);

		return {
			statusCode: 200,
			error: null,
			message: 'success',
			payload: undefined,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const errResponse: ErrorResponse = {
				statusCode:
					(error.response?.status as ErrorStatusCode) || (500 as ErrorStatusCode),
				error: error.response?.data?.error?.message || 'Something went wrong',
				message: error.response?.data?.error?.message || 'An error occurred',
				payload: null,
			};
			throw errResponse;
		}
		throw {
			statusCode: 500,
			error: 'Unknown error',
			message: 'An unknown error occurred',
			payload: null,
		};
	}
};

export default deleteLimitsForIngestionKey;
